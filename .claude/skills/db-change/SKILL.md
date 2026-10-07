---
name: db-change
description: Use when changing backend/prisma/schema.prisma (new model, field, enum, index) or the seed data.
---

# Database change

## Steps
1. Edit `backend/prisma/schema.prisma`.
   - Keep enums in sync with `@sffl/shared` (e.g. `LifePeriod`, `Territory`, `AppLocale`, `MarketCode`).
   - Every relation to `User` uses `onDelete: Cascade` unless there is a reason not to (account deletion must remove personal data).
   - Add indexes for the queries you will run (worker polling, per-user limits).
   - Store the minimum personal data (e.g. birth year, not date of birth). Files are `MediaAsset` rows, never blobs in the database.
   - Timestamps are UTC (`DateTime`), set by the database.
2. Format and validate: `npx prisma format` and `npx prisma validate` (in `backend/`).
3. Create the migration on the user's Mac (Prisma engines cannot be downloaded in Claude's VM):
   ```sh
   npm run prisma:migrate:dev -w @sffl/backend -- --name <short_snake_case_description>
   ```
   Ask the user to run it and commit the generated `backend/prisma/migrations/<timestamp>_<name>/` folder.
4. If reference data changes, update `backend/src/scripts/seed.ts`. The seed must stay idempotent (`upsert`).
5. Update shared types and domain functions if the change affects them.

## Never
- Never edit or delete a migration that has already been applied or pushed. Fix forward with a new migration.
- Never put real user data into the seed.
- Never use `prisma db push` for changes that should reach production.

## Verify in Claude's VM
Prisma client types can be generated without downloading engines:
```sh
PRISMA_QUERY_ENGINE_LIBRARY=/tmp/fake-engine.so.node \
PRISMA_SCHEMA_ENGINE_BINARY=/tmp/fake-schema-engine \
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate
```
(create the two placeholder files first). This is only for typechecking; it cannot talk to a database.
Then run the `verify` skill.
