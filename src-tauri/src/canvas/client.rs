//! The Canvas HTTP client: auth, pagination, rate limiting, session death.
//!
//! Called by: [`super::endpoints`] and `commands::auth`. Nothing else
//! constructs Canvas requests.
//! Calls: reqwest.
//!
//! # Design constraints this module enforces
//!
//! - **Read-only.** The only method that reaches the network is a GET. There
//!   is deliberately no generic `request()` that could grow a body.
//! - **Redirects are never followed.** A 3xx from a Canvas API path means the
//!   SSO layer intercepted the request — following it would hand back an HTML
//!   login page that a JSON parse then reports as a confusing syntax error.
//!   Detecting session death *requires* seeing the redirect itself.
//! - **All requests share one semaphore capped at 4** (§2.0). The cap lives
//!   here so an unbounded `join_all` over courses cannot be introduced above.

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use reqwest::header::{HeaderValue, ACCEPT, CONTENT_TYPE, COOKIE, LOCATION};
use tokio::sync::{RwLock, Semaphore};

/// The Canvas instance this app is built for (SPEC.md §0).
pub const BASE_URL: &str = "https://sjsu.instructure.com";

/// String IDs, always: Canvas IDs exceed JS safe-integer range, and this
/// `Accept` variant makes Canvas serialise them as strings (§2.0).
const ACCEPT_JSON: &str = "application/json+canvas-string-ids";

/// Below this many remaining rate-limit units, back off before the next
/// request. Canvas's bucket refills continuously; 100 of ~700 is the
/// documented comfort zone.
const RATE_LIMIT_FLOOR: f64 = 100.0;

/// How we prove identity to Canvas (§2.0).
///
/// SJSU disables student-generated access tokens, so `Session` is the live
/// path. `Token` exists because an admin-issued token would make everything
/// simpler, and swapping must not touch call sites. `None` is the Tier 2
/// state: ICS feed + manual entry, no Canvas API at all.
#[derive(Clone)]
pub enum AuthMode {
    Token(String),
    Session { cookie_header: String },
    None,
}

impl AuthMode {
    /// Applies credentials to an outgoing request.
    pub fn apply(&self, req: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
        match self {
            AuthMode::Token(t) => req.bearer_auth(t),
            AuthMode::Session { cookie_header } => req.header(COOKIE, cookie_header),
            AuthMode::None => req,
        }
    }

    pub fn is_none(&self) -> bool {
        matches!(self, AuthMode::None)
    }
}

// Hand-written so a credential can never leak through a `{:?}` in a log line.
impl std::fmt::Debug for AuthMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthMode::Token(_) => write!(f, "AuthMode::Token(<redacted>)"),
            AuthMode::Session { .. } => write!(f, "AuthMode::Session(<redacted>)"),
            AuthMode::None => write!(f, "AuthMode::None"),
        }
    }
}

/// Everything that can go wrong talking to Canvas.
///
/// `SessionExpired` is the variant the whole UI flow hangs off: it is produced
/// by [`CanvasClient::check_session_alive`] and mapped to the reconnect banner,
/// never retried automatically (§2.0).
#[derive(Debug, thiserror::Error)]
pub enum CanvasError {
    #[error("Canvas session expired — sign in again")]
    SessionExpired,

    #[error("Canvas is rate-limiting us and retries were exhausted")]
    RateLimited,

    #[error("network problem talking to Canvas: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Canvas returned HTTP {status} for {path}")]
    Http { status: u16, path: String },

    #[error("could not parse the Canvas response from {path}: {source}")]
    Parse {
        path: String,
        #[source]
        source: serde_json::Error,
    },

    #[error("no Canvas credentials are configured")]
    NoAuth,
}

/// Identity confirmed by `GET /api/v1/users/self` — the proof a credential
/// actually works, used by the login poller and the startup restore.
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct ValidatedUser {
    pub id: String,
    pub name: Option<String>,
    pub short_name: Option<String>,
}

/// The one Canvas client. Constructed once at startup, shared via app state.
pub struct CanvasClient {
    base: String,
    http: reqwest::Client,
    auth: RwLock<AuthMode>,
    /// False after any request hits session death; the UI reads this as
    /// "reconnect required". True again only after a successful validate.
    alive: AtomicBool,
    /// Course-level concurrency cap (§2.0). Permits are acquired per request.
    limiter: Semaphore,
    /// Where raw response bodies are persisted, `None` in unit tests.
    raw_dir: Option<PathBuf>,
}

impl CanvasClient {
    /// Build the client.
    ///
    /// # Panics
    /// Panics if reqwest cannot construct a client — that means TLS init
    /// failed, and nothing else in the app would work either.
    pub fn new(base: impl Into<String>, raw_dir: Option<PathBuf>) -> Self {
        let http = reqwest::Client::builder()
            // See module docs: redirects are information here, not plumbing.
            .redirect(reqwest::redirect::Policy::none())
            .timeout(std::time::Duration::from_secs(30))
            // Honest UA rather than a spoofed browser string: this is a
            // personal read-only tool behaving politely, not a scraper hiding.
            .user_agent(concat!("semester-command/", env!("CARGO_PKG_VERSION")))
            .build()
            .expect("reqwest client construction failed (TLS init)");

        Self {
            base: base.into(),
            http,
            auth: RwLock::new(AuthMode::None),
            alive: AtomicBool::new(false),
            limiter: Semaphore::new(4),
            raw_dir,
        }
    }

    /// Swap the auth mode — the "one-line change" §2.0 requires.
    pub async fn set_auth(&self, mode: AuthMode) {
        let alive = !mode.is_none();
        *self.auth.write().await = mode;
        // A fresh credential is presumed alive until a request proves
        // otherwise; a cleared one is definitionally not.
        self.alive.store(alive, Ordering::SeqCst);
    }

    pub async fn auth_mode(&self) -> AuthMode {
        self.auth.read().await.clone()
    }

    /// Is the current session believed to be working?
    pub fn is_alive(&self) -> bool {
        self.alive.load(Ordering::SeqCst)
    }

    /// Force the session-dead state (debug tooling; the reconnect flow needs
    /// to be testable without waiting for SJSU to expire a real session).
    pub fn mark_dead(&self) {
        self.alive.store(false, Ordering::SeqCst);
    }

    /// Confirm a credential works by asking Canvas who we are.
    ///
    /// Used by the login poller (with a candidate cookie header, before it is
    /// stored) and at startup (with the restored credential). On success the
    /// client is marked alive.
    pub async fn validate(&self, mode: &AuthMode) -> Result<ValidatedUser, CanvasError> {
        if mode.is_none() {
            return Err(CanvasError::NoAuth);
        }
        let path = "/users/self";
        let resp = self.send_with(mode, &format!("{}/api/v1{}", self.base, path)).await?;
        self.check_session_alive(&resp)?;

        let status = resp.status().as_u16();
        if status != 200 {
            return Err(CanvasError::Http { status, path: path.into() });
        }
        let body = resp.text().await?;
        let user: ValidatedUser = serde_json::from_str(&body)
            .map_err(|source| CanvasError::Parse { path: path.into(), source })?;
        self.alive.store(true, Ordering::SeqCst);
        Ok(user)
    }

    /// Fetch all pages of a Canvas collection endpoint. Every list call goes
    /// through here — an endpoint that skips it silently returns the first
    /// 100 rows and nothing warns you.
    ///
    /// `path` is relative to `/api/v1`, e.g. `"/courses"`, and may carry a
    /// query string. Pagination follows the `Link` header's `rel="next"` —
    /// Canvas does not return a total count.
    pub async fn get_all<T: serde::de::DeserializeOwned>(
        &self,
        path: &str,
    ) -> Result<Vec<T>, CanvasError> {
        let sep = if path.contains('?') { '&' } else { '?' };
        let mut url = format!("{}/api/v1{}{}per_page=100", self.base, path, sep);
        let mut out = Vec::new();
        let mut page = 0u32;
        // Rate-limit retry state is per-call and resets on every successful
        // page — a global counter would let unlucky moments hours apart
        // combine into a spurious give-up.
        let mut rl_attempts = 0u32;

        loop {
            let auth = self.auth_mode().await;
            let resp = self.send_with(&auth, &url).await?;
            self.check_session_alive(&resp)?;

            let status = resp.status().as_u16();
            if status == 403 {
                // Canvas answers rate-limit rejection with 403 + a telltale
                // body, not 429. Only that body is retryable; any other 403 is
                // a real permission error.
                let body = resp.text().await.unwrap_or_default();
                if body.contains("Rate Limit Exceeded") {
                    backoff_after_rate_limit(path, rl_attempts).await?;
                    rl_attempts += 1;
                    continue; // same URL, same page — retry it
                }
                return Err(CanvasError::Http { status, path: path.into() });
            }
            if status != 200 {
                return Err(CanvasError::Http { status, path: path.into() });
            }

            rl_attempts = 0;
            self.respect_rate_limit(&resp).await;

            // Grab the next link before consuming the response for its body.
            let next = parse_link_next(resp.headers().get("link").and_then(|v| v.to_str().ok()));

            let body = resp.text().await?;
            // Raw JSON hits disk before the parse, so an unexpected shape
            // leaves the evidence on disk instead of only in an error message
            // (§2.2).
            self.log_raw(path, page, &body);

            out.extend(
                serde_json::from_str::<Vec<T>>(&body)
                    .map_err(|source| CanvasError::Parse { path: path.into(), source })?,
            );

            match next {
                Some(u) => {
                    url = u;
                    page += 1;
                }
                None => break,
            }
        }
        Ok(out)
    }

    /// Download a file's bytes, following redirects **manually**.
    ///
    /// Canvas file downloads 302 to inst-fs/S3. The client's no-redirect
    /// policy is what lets session-death detection work, so redirects are
    /// walked by hand here — and credentials are attached ONLY on hops to
    /// the Canvas host. Cookies must never be handed to a storage CDN.
    pub async fn get_bytes(&self, url: &str) -> Result<Vec<u8>, CanvasError> {
        let auth = self.auth_mode().await;
        if auth.is_none() {
            return Err(CanvasError::NoAuth);
        }
        let canvas_host = url::Url::parse(&self.base).ok().and_then(|u| u.host_str().map(String::from));

        let mut current = url.to_string();
        for _hop in 0..5 {
            let _permit = self.limiter.acquire().await.map_err(|_| CanvasError::RateLimited)?;
            let on_canvas = url::Url::parse(&current)
                .ok()
                .and_then(|u| u.host_str().map(String::from))
                == canvas_host;

            let req = self.http.get(&current);
            let req = if on_canvas { auth.apply(req) } else { req };
            let resp = req.send().await?;
            let status = resp.status();

            if status.is_redirection() {
                let next = resp
                    .headers()
                    .get(LOCATION)
                    .and_then(|v| v.to_str().ok())
                    .ok_or(CanvasError::Http { status: status.as_u16(), path: current.clone() })?;
                // Location may be relative; resolve against the current URL.
                current = url::Url::parse(&current)
                    .and_then(|base| base.join(next))
                    .map(|u| u.to_string())
                    .unwrap_or_else(|_| next.to_string());
                continue;
            }
            if status.as_u16() == 401 && on_canvas {
                self.alive.store(false, Ordering::SeqCst);
                return Err(CanvasError::SessionExpired);
            }
            if !status.is_success() {
                return Err(CanvasError::Http { status: status.as_u16(), path: current });
            }
            return Ok(resp.bytes().await?.to_vec());
        }
        Err(CanvasError::Http { status: 310, path: url.to_string() })
    }

    /// One authenticated GET, concurrency-capped. The only network call in
    /// the crate.
    async fn send_with(
        &self,
        auth: &AuthMode,
        url: &str,
    ) -> Result<reqwest::Response, CanvasError> {
        if auth.is_none() {
            return Err(CanvasError::NoAuth);
        }
        // Closed-semaphore is impossible here (we never close it); if it ever
        // happens, treating it as a network error is the least-wrong answer.
        let _permit = self.limiter.acquire().await.map_err(|_| CanvasError::RateLimited)?;

        let req = self
            .http
            .get(url)
            .header(ACCEPT, HeaderValue::from_static(ACCEPT_JSON));
        let resp = auth.apply(req).send().await?;

        tracing::debug!(
            url,
            status = resp.status().as_u16(),
            rate_remaining = rate_limit_remaining(&resp),
            "canvas GET"
        );
        Ok(resp)
    }

    /// The three shapes of session death (§2.0), all mapped to one variant:
    ///
    /// 1. HTTP 401.
    /// 2. Any 3xx — with redirects disabled, a redirect from an API path means
    ///    the SSO layer intercepted us. A foreign `Location` host is the
    ///    classic SSO bounce; a same-host redirect (to `/login`) means the
    ///    same thing. Both are logged with the target for the debug trail.
    /// 3. A 200 whose `Content-Type` is HTML where JSON was expected — Canvas
    ///    serving the login page with a straight face.
    ///
    /// On detection the client marks itself dead. Callers surface the
    /// reconnect state; nobody retries automatically (§2.0).
    fn check_session_alive(&self, resp: &reqwest::Response) -> Result<(), CanvasError> {
        let status = resp.status();

        let dead = if status.as_u16() == 401 {
            tracing::info!("session dead: HTTP 401");
            true
        } else if status.is_redirection() {
            let location = resp
                .headers()
                .get(LOCATION)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("<no Location header>");
            tracing::info!(location, "session dead: API request was redirected");
            true
        } else if status.is_success() {
            let is_html = resp
                .headers()
                .get(CONTENT_TYPE)
                .and_then(|v| v.to_str().ok())
                .map(|ct| ct.contains("text/html"))
                .unwrap_or(false);
            if is_html {
                tracing::info!("session dead: HTML served where JSON was expected");
            }
            is_html
        } else {
            false
        };

        if dead {
            self.alive.store(false, Ordering::SeqCst);
            return Err(CanvasError::SessionExpired);
        }
        Ok(())
    }

    /// Proactive politeness: if the bucket is running low, pause before the
    /// next request rather than risk the 403.
    async fn respect_rate_limit(&self, resp: &reqwest::Response) {
        if let Some(rem) = rate_limit_remaining(resp) {
            if rem < RATE_LIMIT_FLOOR {
                tracing::info!(remaining = rem, "rate-limit bucket low; pausing 5s");
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
            }
        }
    }

    /// Persist a raw response body under the raw dir, one file per
    /// endpoint-page, overwritten on each sync. Failure to write is logged
    /// and swallowed — raw logging must never break a sync.
    fn log_raw(&self, path: &str, page: u32, body: &str) {
        let Some(dir) = &self.raw_dir else { return };
        let stem: String = path
            .trim_start_matches('/')
            .chars()
            .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
            .collect();
        let file = dir.join(format!("{stem}.p{page}.json"));
        if let Err(e) = std::fs::create_dir_all(dir).and_then(|_| std::fs::write(&file, body)) {
            tracing::warn!(file = %file.display(), error = %e, "could not persist raw response");
        }
    }
}

/// Reactive backoff after an actual 403 rate-limit rejection: exponential
/// (2s, 4s, 8s), three attempts per request, then give up with `RateLimited`.
async fn backoff_after_rate_limit(path: &str, attempt: u32) -> Result<(), CanvasError> {
    if attempt >= 3 {
        tracing::warn!(path, "rate-limited three times on one request; giving up");
        return Err(CanvasError::RateLimited);
    }
    let wait = 2u64 << attempt;
    tracing::info!(path, attempt, wait_s = wait, "403 rate-limit body; backing off");
    tokio::time::sleep(std::time::Duration::from_secs(wait)).await;
    Ok(())
}

/// `X-Rate-Limit-Remaining`, parsed. Canvas reports it as a float.
fn rate_limit_remaining(resp: &reqwest::Response) -> Option<f64> {
    resp.headers()
        .get("x-rate-limit-remaining")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse().ok())
}

/// Extract the `rel="next"` URL from a `Link` header.
///
/// The header looks like:
/// `<https://x/api/v1/courses?page=2>; rel="next",<https://x/...>; rel="last"`
/// Canvas keeps to that shape, but this parses defensively: segments split on
/// commas, URL taken from between the angle brackets, rel matched loosely.
fn parse_link_next(header: Option<&str>) -> Option<String> {
    let header = header?;
    for segment in header.split(',') {
        let Some((url_part, rel_part)) = segment.split_once(';') else { continue };
        if rel_part.contains("rel=\"next\"") || rel_part.contains("rel=next") {
            let url = url_part.trim().trim_start_matches('<').trim_end_matches('>');
            if !url.is_empty() {
                return Some(url.to_string());
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The realistic three-link header Canvas actually sends.
    #[test]
    fn link_header_finds_next() {
        let h = concat!(
            "<https://sjsu.instructure.com/api/v1/courses?page=2&per_page=100>; rel=\"next\",",
            "<https://sjsu.instructure.com/api/v1/courses?page=1&per_page=100>; rel=\"first\",",
            "<https://sjsu.instructure.com/api/v1/courses?page=5&per_page=100>; rel=\"last\""
        );
        assert_eq!(
            parse_link_next(Some(h)).as_deref(),
            Some("https://sjsu.instructure.com/api/v1/courses?page=2&per_page=100")
        );
    }

    /// The last page has no rel="next" — that is the loop's exit condition.
    #[test]
    fn link_header_last_page_is_none() {
        let h = "<https://sjsu.instructure.com/api/v1/courses?page=1>; rel=\"first\"";
        assert_eq!(parse_link_next(Some(h)), None);
        assert_eq!(parse_link_next(None), None);
    }

    /// Bookmark-style pagination (opaque cursor) must also work — some Canvas
    /// endpoints use `page=bookmark:...` tokens rather than numbers.
    #[test]
    fn link_header_bookmark_cursor() {
        let h = "<https://sjsu.instructure.com/api/v1/planner/items?page=bookmark%3AWzEwXQ>; rel=\"next\"";
        assert_eq!(
            parse_link_next(Some(h)).as_deref(),
            Some("https://sjsu.instructure.com/api/v1/planner/items?page=bookmark%3AWzEwXQ")
        );
    }

    /// Debug on AuthMode must never print the credential.
    #[test]
    fn auth_mode_debug_redacts() {
        let t = format!("{:?}", AuthMode::Token("secret-token".into()));
        let s = format!(
            "{:?}",
            AuthMode::Session { cookie_header: "canvas_session=secret".into() }
        );
        assert!(!t.contains("secret"));
        assert!(!s.contains("secret"));
    }
}
