# ADR 0018: Git hooks, formatting and commit conventions

- **Status:** Accepted (Bernard, 2026-10-04)
- **Date:** 2026-10-04

## Context
Four people on four laptops (Windows and Linux/EC2), two toolchains (Node and, soon, .NET), and branch protection that may not be available on a private repo (0004). Mistakes should be caught on the developer's machine before they reach CI, and the history should be readable.

## Decision
A small Node toolchain at the **repo root** (its own `package.json`, separate from `web/`), so hooks cover `web/`, `api/` and `docs/` alike:
- **husky:** `pre-commit` runs lint-staged; `commit-msg` runs commitlint; `pre-push` runs the web build (`tsc -b` + Vite) and `npm audit --omit=dev`.
- **lint-staged:** on staged files only: ESLint (`--max-warnings 0`) then Prettier for `web/` code; Prettier for `web/` css/json/html and yml.
- **Prettier:** one config at the root (no semicolons, double quotes, trailing commas es5, 80 columns). Markdown is not auto-formatted, so ADR tables stay hand-written.
- **commitlint:** Conventional Commits (`feat(web): add farmer list`). Allowed scopes: `web`, `api`, `infra`, `docs`, `ci`, `deps`; omit the scope for repo-wide changes.
- **`.gitattributes`:** `* text=auto`, with LF forced for `*.sh` and `.husky/*` (hooks with CRLF fail on Linux and Git Bash).
- When `api/` exists, add `dotnet format --verify-no-changes` for `*.cs` to lint-staged.

## Alternatives considered
- **Hooks only in `web/`:** simpler, but would not cover `api/`, `docs/` or commit messages, and husky would need a `../.git` workaround.
- **pre-commit (Python) or lefthook:** fine tools, but add a second runtime or binary; the team already has Node.
- **No hooks, CI only:** slower feedback and a red PR for every typo. Hooks are bypassable (`--no-verify`), so CI (0004) stays the real gate.

## Consequences
- Bad commit messages and lint errors are stopped before the commit; broken builds before the push.
- `pre-push` takes a few seconds (build + audit); `--no-verify` exists for emergencies and CI still checks.
- A new clone needs `npm ci` at the repo root once (the `prepare` script installs the hooks), then `npm ci` in `web/`.
- Commit scopes are an enforced list; adding an area (for example `ml`) means editing `commitlint.config.js`.
