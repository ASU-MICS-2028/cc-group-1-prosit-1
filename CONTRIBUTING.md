# Contributing to AgroConnect

Read this before your first PR. The rules below are enforced by GitHub, so the
merge button stays disabled until they're met.

## 0. One-time setup: pre-commit hooks

Install the git hooks once after cloning, and install the frontend dependencies
(the ESLint and Prettier hooks use them):

```bash
pip install pre-commit
pre-commit install
cd frontend && npm ci
```

You need Python (for pre-commit), Node 24 LTS and the .NET 10 SDK.

On every commit they will:

- **block secrets** (API keys, AWS credentials, private keys); the repo is public
- lint and auto-format frontend code with ESLint and Prettier (backend: `dotnet format`)
- fix trailing whitespace and missing final newlines, and validate YAML/JSON
- stop you committing straight to `main`, `staging` or `development`

If a hook modifies files, the commit stops: review the changes, `git add`
them, and commit again. CI runs the same checks, so `--no-verify` only moves
the failure to your PR. Unit tests are not run on commit; CI runs them.

## 1. Unit tests are mandatory

**Every PR that adds or changes code must include unit tests for that code.**

- CI runs the full unit test suite on every pull request.
- **Minimum coverage is 70%** for both backend and frontend. If your PR drops
  coverage below 70%, CI fails and the PR cannot be merged.
- A PR with no tests for new code will be sent back by the reviewer, even if
  coverage happens to stay above 70%.
- Bug fixes must include a test that would have caught the bug.

### Backend (ASP.NET Core, C#)

- Application code lives in `backend/src/`, tests in `backend/tests/` (xUnit).
  Test projects reference the `coverlet.msbuild` package so CI can enforce coverage.
- Run locally before pushing:
  ```bash
  cd backend
  dotnet format --verify-no-changes
  dotnet test /p:CollectCoverage=true /p:Threshold=70 /p:ThresholdType=line /p:ThresholdStat=total
  ```
- The API must expose `GET /health` returning HTTP 200. Deployments use it to
  decide whether a release is healthy.
- The API listens on port 8080 in its container and ships as a `backend/Dockerfile`.

### Frontend (React)

- `frontend/package.json` must define these scripts:
  - `lint`: ESLint, and `format:check`: Prettier
  - `test:ci`: runs tests **once** (no watch mode) with coverage and the
    `json-summary` reporter, which writes `coverage/coverage-summary.json`.
    Example for Vitest: `vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text`.
    Example for Jest: `jest --coverage --coverageReporters=json-summary --coverageReporters=text`.
  - `build`: production build
- Coverage excludes vendored shadcn components (`src/components/ui`), `main.tsx` and type files.
- Run locally before pushing (in `frontend/`): `npm run lint && npm run format:check && npm run test:ci && npm run build`
- CI also runs `npm audit --omit=dev`; a vulnerability in shipped code fails the PR.

## 2. Branches

| Branch        | Purpose                         | Who merges                      |
|---------------|---------------------------------|---------------------------------|
| `main`        | Production                      | DevOps lead only                |
| `staging`     | QA / testing (deployed to staging server) | DevOps lead (+ QA)    |
| `development` | Integration, everyone's work lands here | Anyone, once CI passes   |

Promotion is always **development → staging → main**. CI rejects any other
source branch for `staging` and `main` (except `hotfix/*` → `main`).

Nobody pushes directly to `development`, `staging` or `main`. Everything goes
through a pull request.

### Your working branch

Branch off `development` and name it `<type>/<short-name>`:

```
feature/<short-name>   new functionality          feature/farmer-signup
fix/<short-name>       bug fix                    fix/login-redirect
refactor/<short-name>  restructure, no behaviour change   refactor/order-service
test/<short-name>      tests only                 test/payment-edge-cases
docs/<short-name>      documentation              docs/api-usage
chore/<short-name>     tooling, deps, cleanup     chore/bump-fastapi
devops/<short-name>    CI, Docker, infra          devops/add-redis
hotfix/<short-name>    urgent prod fix (from main, DevOps lead only)
```

- Lowercase letters and digits, words separated by hyphens. No spaces,
  underscores, capitals or names (`feature/john-stuff` is not a description).
- **CI enforces this.** A PR into `development` from a badly named branch fails
  the *Branch flow* check. Rename with
  `git branch -m feature/good-name && git push -u origin feature/good-name`,
  then open a new PR.

## 3. Workflow

```bash
git checkout development && git pull
git checkout -b feature/farmer-signup
# ...write code AND unit tests...
git push -u origin feature/farmer-signup
# open a PR into development
```

To merge into `development` you need:

1. **CI passed**: branch name, pre-commit hooks, secret scan, lint, format, dependency audit, unit tests, coverage ≥ 70%, Docker build.
2. **A pull request.** No direct pushes. You can merge your own PR, but asking a teammate to look at bigger changes is encouraged.
3. **Up to date with `development`** and no conflicts. If GitHub says the branch
   is out of date, update it (`git pull origin development`) and push again.
4. All review conversations resolved.

PRs touching `.github/`, `deploy/`, Dockerfiles or compose files also need
approval from the DevOps lead (see `.github/CODEOWNERS`).

## 4. Commits and PRs

- Keep PRs small and focused, ideally under ~400 lines changed.
- Write commit messages in the imperative: `Add farmer signup endpoint`.
- Fill in the PR template, including the unit test checklist.
- Never commit secrets or `.env` files. Use `.env.example` for placeholders.
