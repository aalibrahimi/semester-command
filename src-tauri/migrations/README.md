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

- **Migrations are append-only.** Once a migration has run on the machine
  holding your real grades, editing it does nothing — sqlx records the version
  and skips it. Fix a mistake with a new migration.
- **No destructive statements against synced tables.** `targets` and `estimates`
  hold data that exists nowhere else; a `DROP TABLE` in a migration is
  unrecoverable. See `src/db/mod.rs` for the full invariant.
