# AgroConnect from scratch: a study manual

How the course labs (0 to 4) and lectures turned into the real AgroConnect system: Linux, Git and GitHub, Docker, PostgreSQL, C# on .NET, the React app, and AWS. Each part says **what the course taught**, **what we built with it**, the **files** where it lives, and the **commands** with what every piece means. Read it top to bottom to study; follow part 6 to rebuild everything from an empty folder.

_Last updated: 5 October 2026. Companion docs: [`local-development.md`](local-development.md) (running it day to day), [`tech-choices.md`](tech-choices.md) (why each tool), [`data-dictionary.md`](data-dictionary.md) (every table), [`adr/`](adr/) (decisions)._

---

## 1. The whole system on one page

```
 LAPTOP                         GITHUB                                   AWS af-south-1 (Cape Town)
 ──────                         ──────                                   ─────────────────────────
 code + git ── git push ──▶ repository ── pull request ──▶ CI checks
                                  │  merge to staging/main
                                  ▼
                            deploy workflow ── builds images ──▶ GHCR (image registry)
                                  │                                   │ docker compose pull
                                  └── OIDC: "I am this repo" ──▶ IAM role ── SSM command ──▶ EC2 VM (Ubuntu 24.04)
                                                                                           ├─ frontend container (nginx :8080)
 PHONE / PC ── http(s)://server ─────────────────────────────────────────────────────────▶ │   serves the app, passes /api/* on
                                                                                           ├─ backend container (ASP.NET Core :8080)
                                                                                           │   /health, /api/auth/*, ...
                                                                                           └─ db container (staging only)
                                                                         RDS PostgreSQL (production) ◀─┘   S3 photo bucket
```

| Course | Taught | Where it is in AgroConnect |
|---|---|---|
| Lab 0 | Cloud accounts, Linux CLI, Git/GitHub, Docker | Every folder; `backend/Dockerfile`, `frontend/Dockerfile`; our Git workflow |
| Lab 1 + lecture 1 | Accounts, MFA, billing alerts, IAM, CLIs; what cloud is (NIST), IaaS/PaaS/SaaS | AWS chosen ([ADR 0001](adr/0001-cloud-aws-af-south-1.md)); `deploy/terraform/budget.tf`, `iam.tf` |
| Lab 2 + lecture 2 | A VM, SSH, baseline setup, monitoring; scalability, fault tolerance, latency, ADRs | `deploy/terraform/ec2.tf`, `deploy/ec2-bootstrap.sh`, `/health` + automatic rollback, `docs/adr/` |
| Lab 3 | A microservice in a container, a registry, Kubernetes basics | The C# API as a container, images in GHCR, Docker Compose on EC2 |
| Lab 4 + lecture 4 | Managed database, object storage, real persistence, an offline PWA | PostgreSQL (EF Core migrations), RDS, S3, the React PWA with offline storage |

---

## 2. Lab 0: the foundations

### 2.1 Linux command line
Servers, containers and cloud VMs run Linux, so these commands work in Git Bash on Windows, on the EC2 server, and inside containers.

| Command | Meaning |
|---|---|
| `pwd`, `ls -la`, `cd ~` | Where am I; list everything with details (`-l` long, `-a` hidden files too); go home (`~` = your home folder) |
| `mkdir -p a/{b,c}` | Make folders; `-p` = also make parents, no error if they exist; `{b,c}` = both |
| `echo "text" > file`, `>>` | Write text into a file (`>` replaces, `>>` appends) |
| `cat file` | Print a file |
| `chmod 600 file` | Permissions as three digits, owner / group / everyone: 4 = read, 2 = write, 1 = run. `600` = only the owner reads and writes. Used for SSH keys (`chmod 400 key.pem`: read-only, owner only) |
| `sudo` | Run as administrator |

### 2.2 Git and GitHub
Git records every change; GitHub stores the shared copy and runs the checks.

| Command | Meaning |
|---|---|
| `git config --global user.name "…"` | Your name on every commit |
| `git init` / `git clone <url>` | Start a repository / copy an existing one |
| `git status`, `git diff` | What changed, line by line |
| `git add -A` | Stage everything for the next commit |
| `git commit -m "Add farmer list"` | Save a snapshot; messages are imperative (team rule) |
| `git switch -c feature/x` | New branch from where you are |
| `git push -u origin feature/x` | Send the branch to GitHub; `-u` remembers the link so later `git push` is enough |
| `git fetch origin` | Download the team's new commits without touching your files |
| `git rebase origin/development` | Replay your commits on top of the team's latest work (the DevOps lead's rule before every PR) |
| `git push --force-with-lease` | Push a rebased branch; refuses if someone else pushed meanwhile. Only on your own branch |

**Our flow** ([ADR 0004](adr/0004-branching-and-cicd.md), [`CONTRIBUTING.md`](../CONTRIBUTING.md)): `feature/<name>` → pull request into `development` (never deployed) → `staging` (deploys to the test server) → `main` (live, after approval). Branch names are checked by CI.

**Hooks** ([ADR 0018](adr/0018-git-hooks-and-commit-conventions.md)): [`.pre-commit-config.yaml`](../.pre-commit-config.yaml) runs before every commit: gitleaks (secrets), whitespace and end-of-file fixes, JSON/YAML checks, ESLint, Prettier, `dotnet format`. Install once: `pip install pre-commit` then `pre-commit install`.

### 2.3 Docker
- **Image:** a packaged program plus everything it needs, frozen.
- **Container:** a running copy of an image.
- **Dockerfile:** the recipe for an image.

| Command | Meaning |
|---|---|
| `docker build -t name:tag .` | Build an image from the Dockerfile in `.` and name it |
| `docker run -d -p 8080:80 --name site name:tag` | Start a container in the background (`-d`); port 8080 on the host leads to port 80 inside |
| `docker ps`, `docker logs site` | Running containers; a container's output |
| `docker exec -it site sh` | Open a shell inside a running container |
| `docker stop site && docker rm site` | Stop, then delete the container (the image stays) |
| `docker images` | Images on this machine and their sizes |

---

## 3. Lab 1 and lecture 1: the cloud, accounts and the decision

**What the lecture taught:**
- **Cloud (NIST SP 800-145):** on-demand self-service, broad network access, resource pooling, rapid elasticity, measured service.
- **Service models:** IaaS (we rent VMs), PaaS (the platform runs our code), SaaS (finished software).
- **Deployment models:** public, private, hybrid.

**What the lab did:**
- Accounts on AWS, Azure and GCP.
- MFA and a billing alert on each.
- A non-root IAM user.
- The three CLIs, verified with `aws sts get-caller-identity`, `az account show` and `gcloud config list` ("who am I?" for each cloud).

**What we chose and why:**
- **AWS in Cape Town (af-south-1)** ([ADR 0001](adr/0001-cloud-aws-af-south-1.md)):
  - Lab 1 found AWS and Azure within 1% on price ($40.55 against $40.92 a month for the same machine).
  - Cape Town answers Accra in 116 to 136 ms, against 166 to 178 ms from Ireland.
  - The team knows AWS, and we wrote that down as a bias.
- **IaaS (EC2 VMs) running our own containers:** cheap and fully under our control.

**Where it lives:**
- [`deploy/terraform/budget.tf`](../deploy/terraform/budget.tf): the monthly budget with email alerts at 50, 80 and 100%. This is Lab 1's billing alert, written as code.
- [`deploy/terraform/iam.tf`](../deploy/terraform/iam.tf): the least-privilege roles (the servers' role, and the GitHub deploy role).

---

## 4. Lab 2 and lecture 2: a VM, and designing for failure

**The lab:**
- **Launch a VM and connect:**
  - `chmod 400 key.pem`: the key must be private or SSH refuses it.
  - `ssh -i key.pem ubuntu@<ip>`: log in.
- **Run the baseline script:**
  - `sudo apt update && sudo apt upgrade -y`: refresh and update the system's packages.
  - `curl -fsSL https://get.docker.com | sudo sh`: install Docker.
  - `sudo usermod -aG docker $USER`: let your user run Docker without sudo. Log in again for it to take effect.
- **Load it and watch:** `stress-ng` generates CPU load, and the cloud's monitoring graphs show it.

**The lecture's ideas, and where we used them:**

| Idea | Meaning | In AgroConnect |
|---|---|---|
| Scalability vs elasticity | Can grow / grows and shrinks by itself | One t3.micro per environment now; [phase-1-overview](phase-1-overview.md) §10 plans scaling out |
| Fault tolerance | Keep working when a part fails | The phone saves offline; a failed deploy rolls back by itself |
| Stateless design | A server keeps no user data, so it can be replaced | Data lives in PostgreSQL and S3; the VM can be rebuilt in about 20 to 30 minutes |
| "The nines" | 99.5% up = about 3.65 hours down a month | Our target; two parts at 99.5% each give 99.0% together |
| RTO / RPO | How fast we recover / how much data we may lose | Targets: 4 hours / 24 hours ([phase-1-overview](phase-1-overview.md) §3) |
| Latency | Distance costs time; 150 ms matters on 2G | Why Cape Town |
| Observability | Logs, metrics, traces | Serilog structured logs, `/health`, CloudWatch |
| ADRs | Write down each decision and its trade-off | [`docs/adr/`](adr/) (23 so far) |

**How our servers are made today** (DevOps lead):
- [`deploy/terraform/ec2.tf`](../deploy/terraform/ec2.tf) creates one Ubuntu 24.04 VM per environment with a fixed IP.
- [`deploy/ec2-bootstrap.sh`](../deploy/ec2-bootstrap.sh) does Lab 2's baseline: installs Docker, creates a `deploy` user in the `docker` group, and creates `/opt/agroconnect`.
- **SSH is closed.** People and the pipeline reach the server through **AWS Session Manager (SSM)** instead, so no port 22 is open to the internet.

---

## 5. Labs 3 and 4: containers, a real database, storage and an offline app

### 5.1 Lab 3: a microservice in a container
The lab containerised a small Node.js API with this Dockerfile. Each line is a lesson we kept:

```dockerfile
FROM node:20-alpine        # start from an official, small base image
WORKDIR /app               # every following command runs in /app
COPY package*.json ./      # copy the dependency list first...
RUN npm ci --omit=dev      # ...and install: this layer is cached until the list changes
COPY . .                   # then the code (changes often, so it comes last)
EXPOSE 3000                # the port the app listens on (documentation)
USER node                  # never run as root
CMD ["node", "server.js"]  # what runs when the container starts
```

Then the lab:
- Pushed the image to a **registry**: `docker login`, `docker tag`, `docker push`.
- Ran it on **Kubernetes**: `kubectl create deployment`, `scale --replicas=3`, then deleted a pod and watched it come back.

**Our version, [`backend/Dockerfile`](../backend/Dockerfile):** a **multi-stage** build.
1. **Stage 1** (`mcr.microsoft.com/dotnet/sdk:10.0`, the big image with the compiler): `dotnet restore`, then `dotnet publish -c Release -o /out`.
2. **Stage 2** (`mcr.microsoft.com/dotnet/aspnet:10.0`, runtime only): copies `/out`, switches to the non-root user (`USER $APP_UID`), listens on 8080 and starts with `ENTRYPOINT ["dotnet", "AgroConnect.Api.dll"]`.

Only stage 2 ships, so the image has no compiler or source code: smaller, and less for an attacker. [`frontend/Dockerfile`](../frontend/Dockerfile) does the same: Node builds the app, then `nginx-unprivileged` serves it on 8080.

**Registry and orchestration:**
- We use **GHCR** (GitHub's registry) instead of Docker Hub, so images sit next to the code.
- We use **Docker Compose** instead of Kubernetes: about $73 a month for a Kubernetes control plane is beyond our budget ([ADR 0019](adr/0019-devops-pipeline.md)).

### 5.2 Lab 4: managed database, object storage, persistence
**The lab:**
1. Create PostgreSQL on **RDS** (private: only the VM may connect).
2. Create a `farmers` table with SQL, and check it with `psql "postgres://user:pass@host:5432/agroconnect" -c "\d farmers"`.
3. Create a **private** S3 bucket for media.
4. Give the container the database address as an environment variable (`-e DATABASE_URL=…`).
5. Stop and restart the container to prove the data stays.

**Our version:**
- **The tables are C# classes, not hand-written SQL.** [`backend/Services/Libs/Data/Entities/`](../backend/Services/Libs/Data/Entities/) holds them; [`Persistence/AppDbContext.cs`](../backend/Services/Libs/Data/Persistence/AppDbContext.cs) sets names, lengths, indexes and foreign keys.
- **Migrations generate the SQL.** `dotnet dotnet-ef migrations add <Name>` writes it into `Data/Migrations/`, and [`DatabaseMigrator.cs`](../backend/Services/Libs/Data/DatabaseMigrator.cs) applies it when the API starts. This is the lecture's "migrate your schema safely".
- **Same idea for the connection setting, different name.** Lab 4's `DATABASE_URL` is our `ConnectionStrings__Default`; the `__` means "one level down" in .NET settings.
- **Real persistence.** The local database is a container with a volume ([`backend/docker-compose.dev.yml`](../backend/docker-compose.dev.yml)); staging uses a container; production uses **RDS** ([`deploy/terraform/database.tf`](../deploy/terraform/database.tf): private, encrypted, 7-day backups).
- **Photos** go to one private S3 bucket per environment ([`storage.tf`](../deploy/terraform/storage.tf)), through short-lived upload links ([ADR 0008](adr/0008-photos-compressed-direct-to-s3.md)).

### 5.3 Lecture 4: SQL vs NoSQL and offline-first
| Lecture idea | Our answer |
|---|---|
| SQL vs NoSQL, ACID vs BASE | PostgreSQL: linked data that must never be half saved ([ADR 0006](adr/0006-postgres-over-nosql.md)) |
| Indexes, normalisation | Indexes on phone and "changed since" ([data-dictionary](data-dictionary.md)); lists as arrays to keep sync simple |
| PWA: manifest + service worker | `vite-plugin-pwa` (Workbox) generates both |
| IndexedDB vs Cache API | Dexie (IndexedDB) for farmers and the "to send" queue; Cache API for the app's files |
| Background sync, conflict resolution | IDs made on the phone (resending is harmless); the newest change wins ([ADR 0005](adr/0005-offline-first-sync.md)) |

---

## 6. Building it from scratch

### 6.1 Install once
- Git
- Docker Desktop
- .NET 10 SDK
- Node 24 LTS
- Python (for pre-commit)
- VS Code

Then, after cloning, run the VS Code task **First-time setup**. It runs `npm ci` (install the exact package versions from `package-lock.json`), `dotnet restore` (download NuGet packages) and `dotnet tool restore` (install `dotnet-ef`).

### 6.2 The repository layout ([ADR 0017](adr/0017-single-repository.md))
```
backend/    C# API (.NET 10)          frontend/  React PWA (Vite)
deploy/     servers (DevOps lead)     .github/   CI and deploy workflows
docs/       decisions and guides      .vscode/   shared editor tasks
```

### 6.3 The backend, step by step (C# / .NET 10)
| Step | Command or file | Meaning |
|---|---|---|
| Solution | `dotnet new sln -n AgroConnect` | A list of projects built together ([`AgroConnect.sln`](../backend/AgroConnect.sln)) |
| API host | `dotnet new web -o APIs/agroconnect-api` | The program that starts the web server ([`Program.cs`](../backend/APIs/agroconnect-api/Program.cs)) |
| Services and libraries | `dotnet new classlib -o Services/AuthService` (also `PlatformService`, `Libs/SharedLibrary`, `Libs/Data`) | Code split by area ([ADR 0020](adr/0020-backend-service-structure.md)) |
| Tests | `dotnet new xunit -o tests/AuthService.Tests` | One test project per code project |
| Wire them | `dotnet sln add …`, `dotnet add reference …` | Which project uses which |
| Shared settings | [`Directory.Build.props`](../backend/Directory.Build.props), [`Directory.Packages.props`](../backend/Directory.Packages.props), [`global.json`](../backend/global.json) | .NET 10, warnings as errors; one place for all package versions; the SDK version |
| An endpoint | a class implementing `IFeature` in `Features/` | e.g. [`RequestCode.cs`](../backend/Services/AuthService/Features/RequestCode.cs): `app.MapPost("/api/auth/code", Handle)` |
| Register it | `AddAuthService()` in [`AuthServiceExtension.cs`](../backend/Services/AuthService/AuthServiceExtension.cs), one line in `Program.cs` | Dependency injection: the handler asks for `AppDbContext`, `IClock`, `ISmsSender`, and .NET supplies them |
| Database | `dotnet dotnet-ef migrations add InitialSchema --project Services/Libs/Data --startup-project APIs/agroconnect-api --output-dir Migrations` | Generates the SQL from the entities |
| Run | `dotnet run --project APIs/agroconnect-api` | Starts on `http://localhost:8000` (from `launchSettings.json`); Swagger UI at `/swagger` |
| Test | `dotnet test` | Unit tests plus real-PostgreSQL tests (Testcontainers starts a throwaway database) |

**What `Program.cs` does, in order:**
1. Logging (Serilog), the error format (problem details), the API contract (OpenAPI).
2. JSON rules (enums as words).
3. Trust nginx's forwarded headers.
4. Add each service: `AddSharedLibrary().AddData().AddPlatformService().AddAuthService()`.
5. The request pipeline: errors → authentication (who are you?) → authorization (may you?) → rate limiting.
6. `MapFeatures()`: every endpoint.

**Settings:**
- `appsettings.json` is for every environment; `appsettings.Development.json` is for laptops only.
- Servers get environment variables (`ConnectionStrings__Default`, `Auth__SigningKey`, `Database__MigrateOnStartup`) from their `.env` file.

### 6.4 The database on a laptop
[`backend/docker-compose.dev.yml`](../backend/docker-compose.dev.yml) runs `postgres:17-alpine`:
- **Port:** `127.0.0.1:5433:5432`, reachable only from this laptop. 5433 avoids clashing with a local install.
- **Volume:** `agroconnect-db` keeps the data.
- **Health check:** `pg_isready` checks the database answers.

| Command | Does |
|---|---|
| `docker compose -f docker-compose.dev.yml up -d db` | Start the database (`-f` = this file, `up` = create and start, `-d` = in the background, `db` = only this service) |
| `docker exec -it backend-db-1 psql -U agroconnect -d agroconnect` | SQL inside the container (`\dt` lists tables, `\q` quits) |
| `docker compose -f docker-compose.dev.yml down -v` | Delete the container **and its data** (start fresh) |

### 6.5 The frontend, step by step (React PWA)
| Step | Command or file | Meaning |
|---|---|---|
| Create | `npm create vite@latest frontend -- --template react-ts` | React + TypeScript with the Vite build tool |
| Styling | Tailwind (`@tailwindcss/vite`), shadcn/ui; Figma colours in [`src/index.css`](../frontend/src/index.css) | Utility classes; only the used ones ship |
| Pages | [`src/app/router.tsx`](../frontend/src/app/router.tsx) | Each screen loads only when opened |
| Roles | [`src/app/guards.ts`](../frontend/src/app/guards.ts) | Signed out → start screens; officer → `/`; farmer → `/farmer` |
| Languages | [`src/i18n/`](../frontend/src/i18n/) | English built in; Twi, Ewe, Dagbani load when chosen |
| Talk to the API | `npm run api:types` → [`src/api/schema.d.ts`](../frontend/src/api/schema.d.ts); [`src/api/client.ts`](../frontend/src/api/client.ts) | Types generated from the API contract; every call sends language and token |
| Dev proxy | `server.proxy` in [`vite.config.ts`](../frontend/vite.config.ts) | `/api` → `localhost:8000`, like nginx on the server |
| Run / check | `npm run dev`; `npm run lint`, `test`, `build` | Dev server on 5173; the checks CI runs |
| Layouts | Tailwind `md:` (768 px) and `lg:` (1024 px) classes | Phone layout below 768 px, desktop above (team rule) |

### 6.6 From laptop to server: CI/CD ([ADR 0019](adr/0019-devops-pipeline.md))
**CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs on every pull request:
1. Branch-flow rules.
2. Pre-commit hooks.
3. gitleaks secret scan.
4. Detect what changed.
5. **Backend:** `dotnet format`, build, tests with a 70% coverage gate.
6. **Frontend:** lint, tests with 70%, build.
7. Docker builds.
8. A single "CI passed" check.

**Deploy** ([`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)) runs on a merge to `staging` or `main`:
1. Build both images once and push them to GHCR, tagged with the commit.
2. Log in to AWS with **OIDC**: GitHub proves "I am this repository" and receives a short-lived role (`agroconnect-github-deploy-<env>`). No AWS keys are stored anywhere.
3. Find the server and send it a command through **SSM**:
   - write `/opt/agroconnect/.env` from the encrypted SSM parameter;
   - `docker compose pull` and `docker compose up -d`;
   - check `/health` up to 20 times;
   - if it never answers "ok", go back to the previous image.
4. Production waits for a person's approval before the deploy step.

**On the server:**
- [`deploy/docker-compose.yml`](../deploy/docker-compose.yml) runs `backend` (port 8080, health check), `frontend` (nginx, port 80 outside → 8080 inside), and on staging a `db` container.
- [`frontend/.nginx/nginx.conf`](../frontend/.nginx/nginx.conf) serves the app and passes `/api/` to `http://backend:8080`. Compose gives each service a name on a private network.

### 6.7 The servers as code (Terraform)
[`deploy/terraform/`](../deploy/terraform/): `network.tf` (security groups: 80/443 open, database only from the servers), `ec2.tf`, `database.tf`, `storage.tf`, `iam.tf`, `budget.tf`, `app-config.tf` (each server's `.env` as an encrypted SSM parameter).

| Command | Meaning |
|---|---|
| `terraform init` | Download the AWS provider; connect to the shared state in S3 |
| `terraform plan` | Show what would change, change nothing |
| `terraform apply` | Make AWS match the files |
| `terraform output` | Server IPs, bucket names, database endpoint |

---

## 7. One request, end to end: signing in

1. **Phone:** the person types `024 000 0001` on [`LoginPage.tsx`](../frontend/src/features/start/LoginPage.tsx).
   - `toE164` in [`lib/phone.ts`](../frontend/src/lib/phone.ts) turns it into `+233240000001`.
   - [`api/auth.ts`](../frontend/src/api/auth.ts) sends `POST /api/auth/code` with `{phone, role}`.
2. **Network:** on a laptop, Vite's proxy forwards it to `localhost:8000`; on a server, nginx forwards it to `backend:8080`.
3. **API:** the rate limiter checks this address is under 30 requests per 5 minutes.
   - [`RequestCode.cs`](../backend/Services/AuthService/Features/RequestCode.cs) checks the 45 s and 5-per-hour limits, stores a **hash** of a new 6-digit code in `login_codes` (PostgreSQL), and asks `ISmsSender` to text it.
   - It answers `202`.
4. **Phone:** shows the code screen. The person enters the code, and [`CodePage.tsx`](../frontend/src/features/start/CodePage.tsx) sends `POST /api/auth/verify`.
5. **API:** [`VerifyCode.cs`](../backend/Services/AuthService/Features/VerifyCode.cs) compares hashes, marks the code used, and finds (or for a farmer, creates) the `users` row.
   - It signs a **JWT** (7 days) with `Auth__SigningKey`.
6. **Phone:** [`auth/session.ts`](../frontend/src/auth/session.ts) keeps the token, and the router opens the officer or farmer home.
   - From now on, every call carries `Authorization: Bearer <token>`.
7. **Any error** comes back as a problem with a key (`CODE_WRONG`) and a message in the user's language (`X-Language` header, texts in `Langs/*.json`).

---

## 8. Test yourself

1. Why does `docker run -p 8080:80` reach nginx inside the container, and what would `-p 80:8080` do?
2. Why is the dependency list copied before the code in a Dockerfile?
3. What is the difference between an image in GHCR and a container on EC2?
4. Why does the backend image have two `FROM` lines?
5. What does `chmod 400 key.pem` protect against?
6. What do `git fetch` and `git rebase origin/development` each do, and why rebase before a PR?
7. Where is the `farmers` table defined, and which command turns that definition into SQL?
8. Why does the API on a server use `ConnectionStrings__Default` rather than `appsettings.Development.json`?
9. What does `/health` check, and what does the deploy pipeline do if it fails?
10. How does GitHub deploy to AWS without any stored AWS keys?
11. Why is the database port open only to the servers, and SSH closed?
12. Why are sign-in codes stored as hashes, and why does "Send code" answer the same for unknown numbers?
13. What decides whether someone sees the phone or the desktop layout: the device, the width or the role?
14. Two parts are each 99.5% available. What is the availability of the whole, and why do farmers lose less than that?
