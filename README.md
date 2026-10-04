# AgroConnect

Offline-first platform connecting smallholder farmers in Ghana with extension
services (Ashesi ICS 534 Cloud Computing, Prosit 1, Team Godabeg).

- `frontend/`: React + TypeScript PWA (Vite, Tailwind, shadcn/ui, Dexie, i18next)
- `backend/`: ASP.NET Core 10 API (C#), to be added
- `deploy/`: EC2 bootstrap, compose file and the deployment runbook
- `docs/`: architecture decision records and project status; start with
  [docs/status.md](docs/status.md)

## Run the frontend locally

```bash
cd frontend
npm ci
npm run dev
```

Requires Node 24 LTS. Other scripts: `npm run lint`, `npm run test:ci`,
`npm run build`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

**Unit tests are required.** Every pull request must include unit tests for the
code it adds or changes, and overall test coverage must stay at or above **70%**.
CI blocks any PR that fails tests or drops below that threshold.

### Branch flow

```
feature/* ──PR──▶ development ──PR──▶ staging ──PR──▶ main
                  (integration)       (QA)            (production)
```

- `development`: open PRs here. Merge yourself once CI is green.
- `staging`: deployed to the staging server for QA. Merged by the DevOps lead.
- `main`: production. Merged by the DevOps lead, deploy requires approval.

Deployment details: [deploy/README.md](deploy/README.md).
