# Contributing to AgroConnect

Read this before your first PR. The rules below are enforced by GitHub, so the
merge button stays disabled until they're met.

## 1. Unit tests are mandatory

**Every PR that adds or changes code must include unit tests for that code.**

- CI runs the full unit test suite on every pull request.
- **Minimum coverage is 70%** for both backend and frontend. If your PR drops
  coverage below 70%, CI fails and the PR cannot be merged.
- A PR with no tests for new code will be sent back by the reviewer, even if
  coverage happens to stay above 70%.
- Bug fixes must include a test that would have caught the bug.

### Backend (FastAPI)

- Application code lives in `backend/app/`, tests in `backend/tests/`.
- Test files are named `test_*.py`. Use `pytest`, and FastAPI's `TestClient`
  for endpoints.
- Run locally before pushing:
  ```bash
  cd backend
  ruff check . && ruff format --check .
  pytest tests --cov=app --cov-fail-under=70
  ```
- The API must expose `GET /health` returning HTTP 200. Deployments use it to
  decide whether a release is healthy.

### Frontend (React)

- `frontend/package.json` must define these scripts:
  - `lint`: ESLint
  - `test:ci`: runs tests **once** (no watch mode) with coverage and the
    `json-summary` reporter, which writes `coverage/coverage-summary.json`.
    Example for Vitest: `vitest run --coverage --coverage.reporter=json-summary --coverage.reporter=text`.
    Example for Jest: `jest --coverage --coverageReporters=json-summary --coverageReporters=text`.
  - `build`: production build
- Run locally before pushing: `npm run lint && npm run test:ci && npm run build`

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

Branch off `development` and name it by type:

```
feature/<short-name>   new functionality      feature/farmer-signup
fix/<short-name>       bug fix                fix/login-redirect
devops/<short-name>    CI, Docker, infra      devops/add-redis
docs/<short-name>      documentation          docs/api-usage
hotfix/<short-name>    urgent prod fix (from main, DevOps lead only)
```

## 3. Workflow

```bash
git checkout development && git pull
git checkout -b feature/farmer-signup
# ...write code AND unit tests...
git push -u origin feature/farmer-signup
# open a PR into development
```

To merge into `development` you need:

1. **CI passed**: lint, unit tests, coverage ≥ 70%, Docker build.
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
