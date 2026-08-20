//! Everything that talks to Canvas.
//!
//! Called by: the sync engine, via [`endpoints`].
//! Calls: reqwest, and the keyring for credentials.
//!
//! # Read-only, always
//!
//! Only `GET`. No CSRF handling, no form posts, no writes of any kind — the app
//! never submits work and never interacts with a live assessment (SPEC.md
//! §2.0). If a code path here would ever issue a `POST`, it is out of scope for
//! this project, not a feature to be gated.
//!
//! # Polite by construction
//!
//! Sync runs at most every 30 minutes, concurrency is capped at 4, and any
//! error backs off. The cap lives in [`client`] rather than at each call site
//! so an unbounded `join_all` over courses cannot be introduced by accident.

pub mod client;
pub mod endpoints;
pub mod models;
