---
name: verify
description: Use before every commit to run lint, typecheck, tests and build for the whole monorepo.
---

# Verify

All four must pass before a commit:
```sh
npm run lint
npm run typecheck
npm run test
npm run build
```
CI (`.github/workflows/ci.yml`) runs the same steps plus `npm ci` and `prisma generate`.

## Running from Claude's Linux VM
The project folder on the user's Mac contains `node_modules` with macOS binaries, and the user's dev servers may be running. Do not run `npm install` or `npm run build` inside that folder from the VM. Instead:
1. Copy the project into the VM without `node_modules`, `.next`, `dist` and `.git`:
   ```sh
   rm -rf $HOME/work && mkdir -p $HOME/work
   tar --exclude=node_modules --exclude=.next --exclude=dist --exclude='*.tsbuildinfo' --exclude=.git \
     -C <project> -cf - . | tar -C $HOME/work -xf -
   ```
2. `npm install` in `$HOME/work`, generate the Prisma client (see the `db-change` skill), then run the four checks there.
3. If `package-lock.json` changed, copy it back to the project folder. Copy back any file changed by `prisma format`.

## On the user's Mac
Do not run `npm run build` while `npm run dev` is running; stop the dev servers first or rely on CI.

## If something fails
Fix the cause and run all checks again. Never commit with failing checks, and never skip or weaken a test to make it pass.
