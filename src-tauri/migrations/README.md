# Migrations

`sqlx` migrations, applied on startup in order. Empty until M1.

Naming: `NNNN_snake_case_description.sql`, zero-padded to four digits
(`0001_initial_schema.sql`). sqlx sorts lexicographically, so the padding is
what keeps `0010` after `0009` rather than after `0001`.

Two rules:

- **Migrations are append-only.** Once a migration has run on the machine
  holding your real grades, editing it does nothing — sqlx records the version
  and skips it. Fix a mistake with a new migration.
- **No destructive statements against synced tables.** `targets` and `estimates`
  hold data that exists nowhere else; a `DROP TABLE` in a migration is
  unrecoverable. See `src/db/mod.rs` for the full invariant.
