---
name: commit
description: Use for every git commit in this repository. Conventional commit messages, no AI attribution, no secrets.
---

# Commit

## Before committing
- The `verify` skill passed.
- `git status` shows only intended files. Never commit `.env`, `.env.local`, credentials, `node_modules`, build output or user photos.

## Message format (English)
```
<type>(<optional scope>): <imperative summary, max ~72 chars>

<optional body: what and why, wrapped at ~72 chars>
```
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`.
Scopes (optional): `frontend`, `backend`, `shared`, `db`, `dev`, `ci`, `worker`.

Examples:
- `feat: domain model and scene catalog`
- `fix(dev): expose Postgres on 5433 and Valkey on 6380`
- `chore(db): initial migration`

## Rules
- **No AI attribution.** Never add `Co-Authored-By`, `Claude-Session`, "Generated with" or similar lines to commits or pull requests.
- Author is the repository owner:
  ```sh
  git -c user.name="Predrag" -c user.email="predrag.vuckovic80@outlook.com" commit -m "..."
  ```
- One logical change per commit. Split unrelated changes.
- Never rewrite history that has been pushed (`--amend`, `rebase`, `push --force`) without the user's explicit request.

## Push
Pushing from Claude's environment is not available until the Claude GitHub App is installed on the repository. Until then, tell the user to run `git push` and list the commits waiting to be pushed (`git log --oneline origin/main..HEAD`).
