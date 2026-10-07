---
name: add-api-endpoint
description: Use when adding or changing a Fastify endpoint in backend/. Defines module layout, validation, error codes and tests.
---

# Add an API endpoint

## Module layout
```
backend/src/modules/<name>/
  routes.ts         Fastify plugin: parsing, validation, HTTP status codes only
  service.ts        domain logic; pure functions or functions that receive dependencies
  service.test.ts   unit tests for service.ts, no database
```
Register the plugin in `backend/src/server.ts` (`await app.register(<name>Routes)`).

## Rules
- Validate every input (`query`, `params`, `body`) with zod `safeParse`. Reuse enums and constants from `@sffl/shared` (`lifePeriods`, `appLocales`, ...) instead of redefining them.
- Error responses are JSON with a stable machine-readable code:
  - `400 { error: "INVALID_QUERY" | "INVALID_BODY", issues }` for malformed input,
  - `401` / `403` for auth problems,
  - `404 { error: "NOT_FOUND" }`,
  - `409` for conflicts (e.g. a moment already exists for this period),
  - `422 { error: "<RULE_NAME>" }` when input is valid but breaks a business rule,
  - `429` when a generation limit is reached.
- Response shapes that the frontend consumes get a zod schema in `@sffl/shared`, so both sides parse the same contract.
- Routes never contain business rules; they call the service.
- Database access goes through `prisma` from `backend/src/lib/prisma.ts`. Select only the fields you return.
- Anything slow (AI generation, video, montage) is never done in the request: create a `GenerationJob` and return its id; the worker processes it.
- Never return storage keys or public file URLs; return short-lived signed URLs only.
- Log with `request.log`; never log personal data, photos, tokens or secrets.

## Tests
- Test the service: happy path, every business-rule error, and edge values (min/max ages, empty lists, missing translations).
- Run the `verify` skill before committing.
