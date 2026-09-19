# Migrations

`sqlx` migrations, applied on startup in order.

Naming: `NNNN_snake_case_description.sql`, zero-padded to four digits
(`0001_init.sql`). sqlx sorts lexicographically, so the padding is what keeps
`0010` after `0009` rather than after `0001`.

There is no `0008` and never was — the number was skipped during a renumber
(0005→0006 collision fix) and sqlx is fine with gaps: it only errors when a
version *recorded in the database* goes missing from this directory. Do not
"fill in" the gap; a fresh 0008 would sort before migrations that already ran.

Two rules:

- **Migrations are append-only, down to the byte.** sqlx records a checksum
  of each applied file and refuses to start when one changes — even a
  comment edit bricks the app with "migration N was previously applied but
  has been modified" (learned the hard way: fixing 0006's header comment,
  which says "0005" from the renumber and must stay saying it). Fix a
  mistake with a new migration; never touch an applied file.
- **No destructive statements against synced tables.** `targets` and `estimates`
  hold data that exists nowhere else; a `DROP TABLE` in a migration is
  unrecoverable. See `src/db/mod.rs` for the full invariant.
