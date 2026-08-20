//! Non-destructive sync writes.
//!
//! Called by: the sync engine.
//! Calls: sqlx.
//!
//! Every write here is `INSERT ... ON CONFLICT(id) DO UPDATE`, keyed on the
//! Canvas ID. There is no `DELETE` and no `DROP` in this module, and that is
//! not an accident — see the invariant in [`super`].
//!
//! Two rules that are easy to violate with an otherwise reasonable upsert:
//!
//! 1. **Never overwrite a `manual` or `ics` row with an API row that is missing
//!    the field.** Canvas omitting `points_possible` must not blank a value the
//!    user typed in. Merge per column, guarded on `source`.
//! 2. **A failed course does not abort the run.** Log it to `sync_log` and
//!    carry on with the next course (§6). One broken course should not cost the
//!    user their other five.
//!
//! TODO(M1).
