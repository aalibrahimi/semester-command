//! The Canvas HTTP client: auth, pagination, rate limiting, retry.
//!
//! Called by: [`super::endpoints`]. Nothing else constructs requests.
//! Calls: reqwest, the keyring.
//!
//! TODO(M1): the whole module. The four things it must get right:
//!
//! ## 1. `AuthMode`
//!
//! ```ignore
//! enum AuthMode { Token(String), Session(CookieJar) }
//! ```
//!
//! Both behind one interface, so that if CFETI ever issues a scoped token
//! (§2.0 Tier 0) the swap is one line and nothing above this module changes.
//! Every request also carries `Accept: application/json+canvas-string-ids`,
//! which stops large IDs from losing precision when they cross into JavaScript.
//!
//! ## 2. Pagination
//!
//! Canvas paginates with the `Link` header, not a page count. One generic
//! paginating fetch helper follows `rel="next"` until it is absent, and *every*
//! call routes through it — a single endpoint that forgets silently returns the
//! first 100 rows and nothing warns you. Default `per_page=100`.
//!
//! ## 3. Rate limiting
//!
//! Canvas uses a leaky bucket and reports `X-Rate-Limit-Remaining` on every
//! response. Below 100, back off. Note that Canvas answers a rate-limit
//! rejection with **403 and a rate-limit body**, not 429 — retry that with
//! exponential backoff rather than treating it as an auth failure, which is the
//! mistake that makes a client look broken when it is merely impatient.
//!
//! ## 4. Session death
//!
//! A 401, a 302 to the SSO host, or an HTML body where JSON was expected all
//! mean the same thing: the session is gone. Surface it as
//! `ErrorKind::SessionExpired` so the UI shows a non-blocking reconnect banner.
//! Never crash, and never show stale grades without marking them stale.
