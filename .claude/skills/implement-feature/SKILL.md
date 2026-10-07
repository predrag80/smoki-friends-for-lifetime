---
name: implement-feature
description: Use for any new feature, delivery phase or non-trivial change in Smoki Friend for a Lifetime. Plans first, waits for the user's approval, then implements, verifies and commits.
---

# Implement a feature

## 1. Understand
- Read `AGENTS.md` (stack, core decisions, delivery phases, open decisions).
- Read the product proposal in the claude.ai project ("SMOKI / FRIEND FOR A LIFETIME") for the part of the flow this feature touches.
- Look at the existing code in the affected modules before designing anything new. Reuse existing patterns.

## 2. Plan and ask (mandatory)
Before writing code, send the user a short plan in Serbian:
- what will be built, as numbered steps,
- new or changed models, endpoints, env variables and screens,
- what the user has to do on their Mac (migrations, nginx, env, push),
- open questions that block the work (e.g. limits, legal texts, age rules).

Do not start implementing until the user approves the plan. If they change it, update the plan first.

## 3. Implement
- Business rules that frontend and backend both need go into `packages/shared/src/domain` as pure functions.
- Backend logic goes into a domain service (`backend/src/modules/<name>/service.ts`), never into route handlers.
- New endpoint: follow the `add-api-endpoint` skill.
- Schema change: follow the `db-change` skill.
- New env variable: add it to `backend/src/config/env.ts` (zod), `backend/.env.example` and, if the frontend needs it, `frontend/.env.example`.
- User-facing text: add it to every locale (`sr`, `bs`, `hr`, `mk`, `de`); Serbian is the fallback until translations arrive.
- Privacy by default: store the minimum personal data, keep files in the private bucket, never log photos, tokens or secrets.
- Keep the project ports (3100 / 4100 / 4101 / 5433 / 6380 / 9000-9001) so the app keeps running next to Smoki.

## 4. Tests
- Every domain rule gets a unit test (`*.test.ts`, `node:test`).
- Services are tested without a database by passing data or dependencies in.

## 5. Document
- Update `AGENTS.md`: phase status, new decisions and rules.
- Update `README.md` when local setup or commands change.

## 6. Verify and commit
- Run the `verify` skill. Do not commit if anything fails.
- Commit with the `commit` skill. Small, logical commits.

## 7. Report
Tell the user in Serbian: what was done, the commit hash, the exact commands they need to run, and what the next step is.
