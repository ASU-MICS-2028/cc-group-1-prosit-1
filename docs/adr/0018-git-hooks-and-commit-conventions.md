# ADR 0018: Git hooks, formatting and commit conventions

- **Status:** Accepted (team, 2026-10-04). Replaces the earlier husky + commitlint setup.
- **Date:** 2026-10-04

## Context
Four people on four laptops (Windows and Linux/EC2), two toolchains (Node and .NET), and a public repo. Mistakes and secrets should be caught on the developer's machine, and the same checks must run in CI so `--no-verify` gets nothing past review. The DevOps lead's pipeline already runs `pre-commit` in CI.

## Decision
- **One hook system: [pre-commit](https://pre-commit.com)** (`.pre-commit-config.yaml`, installed once with `pip install pre-commit && pre-commit install`). Hooks: gitleaks, whitespace and end-of-file fixes, YAML/JSON checks (tsconfig files are exempt: they allow comments), large-file and private-key checks, no commits to `main`/`staging`/`development`, **ESLint and Prettier for `frontend/`**, and later `dotnet format` for `backend/`.
- The same ESLint and Prettier rules run again in CI's frontend job (`npm run lint`, `npm run format:check`); the CI pre-commit job skips those two hooks because it has no `node_modules`.
- **Prettier:** config in `frontend/` (no semicolons, double quotes, trailing commas es5, 80 columns). Markdown is not auto-formatted, so ADR tables stay hand-written.
- **Commit messages:** imperative mood, as in `CONTRIBUTING.md` ("Add farmer signup endpoint"). Branch prefixes (`feature/`, `fix/`, ...) already categorise the work, so there is no commitlint.
- **`.gitattributes`:** `* text=auto`, with LF forced for `*.sh`.

## Alternatives considered
- **husky + lint-staged + commitlint:** what we first set up. Rejected: `pre-commit install` refuses to run when husky sets `core.hooksPath`, so the two cannot coexist, and the team already requires Python for pre-commit.
- **Conventional Commits (commitlint):** more structure for changelogs, but it contradicts the team's CONTRIBUTING rules and adds a Node dependency at the repo root.

## Consequences
- Contributors need Python (for pre-commit) and Node (for the ESLint/Prettier hooks, after `npm ci` in `frontend/`).
- gitleaks builds from source on first run, which can take minutes.
- `--no-verify` only moves the failure to the PR.
