# Running AgroConnect on your laptop, and the cloud ideas behind it

A hands-on guide: every command we use, what it does, and why. Your laptop runs the same pieces as the servers, in the same way (in containers), so each command here teaches a cloud idea you will meet again on EC2.

_Last updated: 5 October 2026. Commands are for Windows (PowerShell or Git Bash). Run backend commands from `backend/` and frontend commands from `frontend/`._

---

## 1. The picture: laptop and server side by side

```
YOUR LAPTOP                                        A SERVER (staging or production, EC2)
───────────                                        ─────────────────────────────────────
Browser ── http://localhost:5173 (Vite dev)        Phone browser ── https://<domain>
             │ /api/* forwarded                                     │
             ▼                                                      ▼
API: `dotnet run` on port 8000                     nginx container (port 8080): app files + /api/*
             │                                                      │
             ▼                                                      ▼
PostgreSQL container (Docker) on port 5433         backend container (port 8080)
                                                                    │
                                                                    ▼
                                                   PostgreSQL container (staging) or RDS (production)
```

On a laptop we run the **database** in a container, and the **API** directly with `dotnet run`. That way code changes show quickly and you can debug. On the servers **everything** runs in containers, started by Docker Compose. You can also run the API in a container locally (section 5.3) to check it behaves exactly as it will on the server.

---

## 2. Words you need

| Word | In plain words | Where you see it here |
|---|---|---|
| **Image** | A packaged program plus everything it needs (OS files, runtime, settings), frozen. A recipe that has already been cooked. | `postgres:17-alpine`; our `backend` and `frontend` images in GHCR |
| **Container** | A running copy of an image, isolated from the rest of the machine. Start, stop, delete and recreate it in seconds. | `backend-db-1` is our database container |
| **Dockerfile** | The recipe that builds an image. | `backend/Dockerfile`, `frontend/Dockerfile` |
| **Docker Compose** | A file that says "run these containers together, with these settings". One command starts the whole set. | `backend/docker-compose.dev.yml` (laptop), `deploy/docker-compose.yml` (servers) |
| **Port mapping** | A container has its own network. `127.0.0.1:5433:5432` means "port 5433 on my laptop leads to port 5432 inside the container". | the database is 5432 inside and 5433 outside |
| **Volume** | Storage that outlives the container. Delete the container and the data stays. | `agroconnect-db` holds the database files |
| **Health check** | A small automatic test that answers "is this working?" Something else (Docker, the pipeline, a monitor) acts on the answer. | section 4 |
| **Environment variable** | A setting given to a program from outside, not written in the code. This is how secrets reach a server. | `ConnectionStrings__Default`, `Auth__SigningKey` |
| **Secret** | A value that must never be in Git (passwords, signing keys). | the server `.env` file, GitHub secrets |
| **Migration** | A versioned, generated script that creates or changes database tables, applied in order. | `backend/Services/Libs/Data/Migrations/` |
| **Reverse proxy** | A front door that receives every request and passes it to the right program. | nginx passes `/api/*` to the backend |
| **Registry** | A store for images. The servers pull from it. | GHCR (GitHub Container Registry) |
| **CI/CD** | Automatic checks on every change (CI), and automatic delivery to servers (CD). | `.github/workflows/ci.yml`, `deploy.yml` |

---

## 3. One-time setup

| Step | Command | What it does |
|---|---|---|
| 1 | Install **Docker Desktop** and start it | Gives you the `docker` command and the engine that runs containers. It must be running whenever you use the database or the tests. |
| 2 | `docker info` | Checks the engine is up. If you get an error, Docker Desktop is not running. |
| 3 | `dotnet tool restore` (in `backend/`) | Installs the tools listed in `backend/dotnet-tools.json`, here `dotnet-ef` (makes migrations). |
| 4 | `npm ci` (in `frontend/`) | Installs the exact frontend packages from `package-lock.json`. |
| 5 | `pip install pre-commit` then `pre-commit install` (repo root) | Turns on the checks that run before every commit. |
| 6 | VS Code: install the **PostgreSQL** extension (Microsoft) | Lets you browse the tables (section 6). |

---

## 4. Health checks: three layers, each with a job

A health check only matters if **something acts on the answer**. We have three:

**1. Docker checks the database container** (in `backend/docker-compose.dev.yml`):
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U agroconnect -d agroconnect"]
  interval: 5s
  retries: 10
```
- Every 5 seconds Docker runs `pg_isready` inside the container. That is PostgreSQL's own "are you accepting connections?" tool.
- `docker ps` then shows `(healthy)` or `(unhealthy)`.
- **Who acts on it:** the `api` service in the same file has `depends_on: db: condition: service_healthy`, so Compose does not start the API until the database answers.

**2. The API's own `/health` endpoint** ([GetHealth.cs](../backend/Services/PlatformService/Features/GetHealth.cs)):
- Answers `200 {"status":"ok", "checks":{"database":"Healthy"}}` only when the API is up **and** the database answers. Otherwise it answers `503` with `"unhealthy"`.
- This is a deep check: it proves the whole path works, not just that the process is alive.
- Try it: open `http://localhost:8000/health` in a browser.

**3. The servers check the backend container and the deploy** (in `deploy/docker-compose.yml` and `.github/workflows/deploy.yml`):
- **The container check:** Docker on the server calls `/health` every 30 seconds. It uses a bash trick (`/dev/tcp`) because the image has no `curl`.
- **The deploy check:** after each deploy, the pipeline calls `/health` up to 20 times. If it never gets `200`, it **rolls back** to the last good image automatically and marks the deploy failed.
- This is why `/health` must be honest. A bad release cannot stay live.

**Cloud lesson:** load balancers, auto-scaling groups and Kubernetes all work this way: they keep asking "healthy?" and replace or stop sending traffic to what says no.

---

## 5. Everyday commands

### 5.1 Start the database

```powershell
cd backend
docker compose -f docker-compose.dev.yml up -d db
```

| Part | Meaning |
|---|---|
| `docker compose` | Use Docker Compose (run several containers from one file). |
| `-f docker-compose.dev.yml` | Which Compose file to read. The laptop file, not the server one. |
| `up` | Create and start what the file describes (download the image the first time). |
| `-d` | "Detached": run in the background and give the terminal back. |
| `db` | Only start the service called `db`, not the optional `api`. |

What the `db` service in that file sets up:
- `image: postgres:17-alpine`: official PostgreSQL 17 on Alpine Linux (a small image).
- `environment:` creates the user `agroconnect`, password `agroconnect_dev` and database `agroconnect` on first start. These are laptop-only values; never reuse them.
- `ports: "127.0.0.1:${DB_PORT:-5433}:5432"`:
  - `127.0.0.1` means only your own laptop can connect, not other machines on the Wi-Fi.
  - `${DB_PORT:-5433}` means "use DB_PORT from `.env` if set, else 5433". We use 5433 so it never clashes with a PostgreSQL installed on the laptop (which uses 5432).
- `volumes: agroconnect-db:/var/lib/postgresql/data` keeps the data in a named volume, so stopping or recreating the container keeps your tables and rows.
- `restart: unless-stopped`: Docker restarts it after a crash or a reboot, unless you stopped it yourself.

### 5.2 Check it is running

```powershell
docker ps
```
Shows running containers. Look for `backend-db-1 ... Up ... (healthy) 127.0.0.1:5433->5432/tcp`. The name is `<folder>-<service>-<number>`: Compose names the project after the folder, `backend`.

Useful extras:

| Command | What it shows |
|---|---|
| `docker ps -a` | Also stopped containers |
| `docker logs backend-db-1 --tail 50` | The last 50 log lines of the database |
| `docker compose -f docker-compose.dev.yml ps` | Only this project's containers |
| `docker volume ls` | Volumes, including `backend_agroconnect-db` |

### 5.3 Run the API

```powershell
cd backend
dotnet run --project APIs/agroconnect-api
```
- Builds and starts the API on `http://localhost:8000`. The port comes from `Properties/launchSettings.json`, which also sets the environment to **Development**.
- In Development it reads `appsettings.Development.json`. That file holds the local database address, a laptop-only signing key, the fixed sign-in code `123456`, "migrate on start" and the demo officer.
- On start you will see `Now listening on: http://localhost:8000`, then `Database is up to date`. That second line means [DatabaseMigrator.cs](../backend/Services/Libs/Data/DatabaseMigrator.cs) created or updated the tables and added the demo officer and sample farmer.
- If the database is not up yet you see `Database not ready yet, retrying in 5 s`. It keeps trying, which is how it copes with containers starting in any order on a server.
- Stop it with `Ctrl+C`.

**Option: run the API in a container too**, exactly as on the server:
```powershell
docker compose -f docker-compose.dev.yml --profile api up --build
```
- `--profile api` turns on the `api` service, which is off by default.
- `--build` builds the image from `backend/Dockerfile` first.
- Inside Compose the API reaches the database as `db`, not `localhost`. Compose gives each service a name on a private network.

### 5.4 Try the endpoints

In a browser: `http://localhost:8000/health`, and the API contract at `http://localhost:8000/openapi/v1.json` (Development only).

**Sign in as the demo officer from PowerShell.** Use `Invoke-RestMethod`; in Windows PowerShell 5.1, `curl` is not the real curl.
```powershell
# 1. Ask for a code. Answers 202; on a laptop the "SMS" appears in the API's log.
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/auth/code -ContentType 'application/json' -Body '{"phone":"024 000 0001","role":"officer"}'

# 2. Send the code back. Answers with a token and the user.
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/auth/verify -ContentType 'application/json' -Body '{"phone":"0240000001","role":"officer","code":"123456"}'
$login.user

# 3. Call a protected endpoint with the token ("Bearer" token in the Authorization header).
Invoke-RestMethod -Uri http://localhost:8000/api/me -Headers @{ Authorization = "Bearer $($login.token)" }
```
The sample farmer signs in the same way with phone `0240001234` and role `farmer`.

What to notice:
- **Step 1** gives the same answer for any number. That is on purpose, so nobody can find out who is registered.
- **Asking again within 45 seconds** gives a `429 Too Many Requests` "problem" in JSON. Every error from the API has this shape: `title` is a stable key the app can check, `detail` is the message in the caller's language.
- **Step 3 without the header** gives `401 Unauthorized`.

### 5.5 Run the tests

```powershell
cd backend
dotnet test                       # everything (Docker must be running)
dotnet test --filter Category=Unit  # only the fast tests, no Docker needed
dotnet test -p:CollectCoverage=true -p:Threshold=70 -p:ThresholdType=line -p:ThresholdStat=total   # what CI runs
```
- **Testcontainers:** many tests start their **own throwaway PostgreSQL container**, run against it, then delete it. That is why Docker must be running. You will see containers named `testcontainers-...` appear in `docker ps` for a few seconds.
- We test against the real database, not a fake, so the tests catch real database behaviour (SQL, arrays, indexes, migrations).
- **The coverage rule:** the last command fails if any test project covers less than 70% of its code's lines, the same rule as CI.

Frontend, from `frontend/`: `npm run lint`, `npm run format:check`, `npm run test:ci`, `npm run build`.

### 5.6 Stop things

| Command | Effect | Data |
|---|---|---|
| `Ctrl+C` in the API terminal | Stops the API | Kept |
| `docker compose -f docker-compose.dev.yml stop` | Stops the containers | Kept |
| `docker compose -f docker-compose.dev.yml down` | Stops and **removes** the containers | Kept (the volume stays) |
| `docker compose -f docker-compose.dev.yml down -v` | Also deletes the volume | **Deleted.** Next start is an empty database; the API recreates tables and demo data. Use it to start fresh. |

---

## 6. Look inside the database

**In VS Code (PostgreSQL extension):** Add Connection, then fill in:
- **Server name:** `127.0.0.1`. Not `localhost`: on Windows, `localhost` can mean the IPv6 address `::1` first, and Docker publishes our port on IPv4 only, so the connection times out.
- **User:** `agroconnect`
- **Password:** `agroconnect_dev`
- **Database:** `agroconnect`
- **Advanced → Port:** `5433`
- **SSL:** if it complains, set the mode to `disable`. The local container has no SSL; the servers will.

Quicker: use the **Connection String** tab. Paste the line below and type the password `agroconnect_dev` in the separate **Password** box.
```
postgresql://agroconnect@127.0.0.1:5433/agroconnect?sslmode=disable
```
- **Read it as:** user `agroconnect` @ address `127.0.0.1` : port `5433` / database `agroconnect`, no SSL.
- **The format matters:** the extension only accepts this web-address style, without the password. The `host=... port=...` style is refused with "format not supported", even without a password.
- **Why the password is separate:** it never ends up in a saved settings string.

Click **Test Connection** (a tick means it worked), then **Save & Connect**.

Then open **agroconnect → Schemas → public → Tables**.

**In a terminal:**
```powershell
docker exec -it backend-db-1 psql -U agroconnect -d agroconnect
```
`docker exec` runs a command **inside** a running container. `-it` makes it interactive. `psql` is PostgreSQL's command-line client, which is already inside the image.

Useful `psql` commands:

| Type | Does |
|---|---|
| `\dt` | List tables |
| `\d farmers` | Show the columns of `farmers` |
| `select full_name, phone_e164 from farmers;` | Read rows (end SQL with `;`). More queries, and what every column and number means: [data-dictionary.md](data-dictionary.md) |
| `select * from "__EFMigrationsHistory";` | Which migrations have run |
| `\q` | Quit |

The tables:
- **`users`:** people who can sign in.
- **`login_codes`:** SMS codes, stored as hashes.
- **`farmers`:** all 7 registration steps.
- **`visits`:** officer visits.
- **`photos`:** photo records.
- **`__EFMigrationsHistory`:** where the migration tool records what it has applied.

---

## 7. Changing the database (migrations)

1. Change an entity class in `backend/Services/Libs/Data/Entities/` (for example, add a column).
2. Generate the migration, from `backend/`:
   ```powershell
   dotnet dotnet-ef migrations add AddFarmerNickname --project Services/Libs/Data --startup-project APIs/agroconnect-api --output-dir Migrations
   ```
   `dotnet-ef` compares your classes with the last snapshot and writes the SQL steps (`Up` to apply, `Down` to undo) into a new file. Read it before committing.
3. Restart the API. It applies the new migration on start. The servers do the same on deploy, so **the database change ships with the code that needs it**.

Never edit an applied migration. Add a new one instead, because the servers have already run the old one.

---

## 8. How the images are built (the Dockerfiles)

**[`backend/Dockerfile`](../backend/Dockerfile)** is a two-stage build:
1. **Build stage** (`dotnet/sdk` image, large, has the compiler): restore packages, then `dotnet publish` the API into `/out`.
2. **Run stage** (`dotnet/aspnet` image, small, runtime only): copy `/out` in, switch to a **non-root user**, listen on port 8080.

Only stage 2 ships, so the image has no compiler or source code. It is smaller and gives an attacker less to use. Running as non-root means a break-in cannot take over the container.

**[`frontend/Dockerfile`](../frontend/Dockerfile)** works the same way:
1. **Build stage:** Node builds the app into static files.
2. **Run stage:** `nginx-unprivileged` serves them on 8080. Its config ([`frontend/.nginx/nginx.conf`](../frontend/.nginx/nginx.conf)):
   - forwards `/api/*` to the `backend` container
   - caches hashed files for a year
   - never caches `index.html` or the service worker, so phones always get updates.

**Build caching:** `--mount=type=cache` keeps downloaded packages between builds, so a retry after a network drop resumes instead of starting over.

---

## 9. From laptop to server (the cloud part)

| Step | Where | What happens |
|---|---|---|
| 1 | Laptop | You commit; pre-commit checks format, lint and secrets. You push a `feature/...` branch. |
| 2 | GitHub Actions (CI) | On the pull request: frontend and backend checks, tests with a throwaway database, the 70% coverage gate, Docker builds. |
| 3 | GitHub Actions (CD) | On merge to `staging` or `main`: build each image **once**, tag it `sha-<commit>`, push it to GHCR. |
| 4 | EC2 server | The pipeline SSHes in, writes the new tag, runs `docker compose pull` and `up -d`, then checks `/health` (section 4). |
| 5 | EC2 server | Healthy: done, and the tag is saved as the last good one. Not healthy: roll back to the last good tag. |

The difference between laptop and server is **configuration, not code**:

| Setting | Laptop | Server |
|---|---|---|
| Environment | `Development` | `Production` |
| Database address | `appsettings.Development.json` | `ConnectionStrings__Default` in the server's `.env` |
| Signing key | dev key in `appsettings.Development.json` | `Auth__SigningKey` in `.env` (a long random secret). The API **refuses to start** without it. |
| Sign-in code | always `123456`, printed in the log | real SMS through Africa's Talking (later) |
| Migrations and demo data | `Database:MigrateOnStartup=true`, demo officer seeded | decided per environment; never demo data in production |

The double underscore `__` in an environment variable name means "go one level down", so `Auth__SigningKey` sets `Auth:SigningKey`. This is the standard way to pass nested settings to a container.

**Settings each server needs** (in `/opt/agroconnect/.env`, owned by the DevOps lead; never committed):

| Variable | Staging | Production | Why |
|---|---|---|---|
| `ConnectionStrings__Default` | the staging PostgreSQL | RDS | Where the database is |
| `Auth__SigningKey` | a long random value (e.g. `openssl rand -base64 48`) | a **different** long random value | Signs sign-in tokens; the API **will not start** without one of at least 32 bytes |
| `Database__MigrateOnStartup` | `true` | `true` (Phase 1: one server, so start-up is the simplest safe moment) | Creates and updates the tables. Without it the tables never appear and sign-in fails |
| `Auth__FixedCode` | `123456` until Africa's Talking is connected | **never** | Lets the demo sign in without SMS. On production it would let anyone who knows an officer's number sign in |
| `Seed__Officers__0__FullName`, `__Phone`, `__Region`, `__District`; `Seed__SampleFarmer` | demo officer and sample farmer, for the demo | **never** | Fake demo data only |

Changes to Dockerfiles, compose files, nginx, `deploy/` or `.github/` are agreed with the DevOps lead **before** they are made, because they change how the servers build and run the app. Changes that add a setting like those above are announced to him in the pull request.

---

## 10. When something goes wrong

| You see | Why | Fix |
|---|---|---|
| `error during connect` or "Docker daemon is not running" | Docker Desktop is closed | Start Docker Desktop, then `docker info` |
| The API log says `Database not ready yet, retrying` forever | The database container is not running | `docker compose -f docker-compose.dev.yml up -d db` |
| A database tool "couldn't reach localhost" | `localhost` went to IPv6 `::1` | Use `127.0.0.1` |
| VS Code PostgreSQL: "Connection string format not supported, please omit password" | It only accepts the `postgresql://user@host:port/db` style, with no password | Use `postgresql://agroconnect@127.0.0.1:5433/agroconnect?sslmode=disable` and type the password in the Password box |
| `port is already allocated` | Something else uses 5433 or 8000 | Stop it, or set `DB_PORT=5434` in `backend/.env` (copy from `.env.example`) and change the connection string to match |
| `Auth:SigningKey must be at least 32 bytes` on start | No signing key (not running as Development?) | Use `dotnet run`, which sets Development, or set `Auth__SigningKey` |
| Tests hang or fail with Docker errors | Testcontainers needs Docker | Start Docker Desktop, or run `dotnet test --filter Category=Unit` |
| `429` when asking for a code | The 45-second resend wait, or 5 codes an hour | Wait, or use another number |
| On the very first start against an empty database, one `ERR Failed executing DbCommand ... FROM "__EFMigrationsHistory"` line, then `Database is up to date` | The migration tool first asks "which migrations have run?" before its history table exists; the query fails, it creates the table and carries on | Nothing: expected once per new database. Any other `ERR` line is a real problem |
| You want a clean database | Old test data | `docker compose -f docker-compose.dev.yml down -v`, then `up -d db`, then restart the API |

---

## 11. Log: what was run and why (5 October)

| Command | Why |
|---|---|
| `docker compose -f docker-compose.dev.yml up -d db` | Start the local database for the first live test of sign-in |
| `dotnet run --project APIs/agroconnect-api --no-build` | Start the API (already built), which created the tables and the demo data |
| `curl localhost:8000/health` | Check the API and database are both up: `{"status":"ok","checks":{"database":"Healthy"}}` |
| `POST /api/auth/code`, `POST /api/auth/verify`, `GET /api/me` | Sign in as the demo officer end to end. The "SMS" appeared in the log as `SMS to ***0001: Your AgroConnect code is 123456...` (the phone is masked: no personal data in logs) |
| `docker exec backend-db-1 psql ... -c "\dt"` | Confirm the five tables exist |
| `dotnet test AgroConnect.sln -p:CollectCoverage=true ...` | All backend tests pass (107 at the time); every project above 70% |
| `Test-NetConnection 127.0.0.1 -Port 5433` and `::1` | Found why the VS Code extension could not connect: IPv4 works, IPv6 does not |
| VS Code PostgreSQL extension, connection string `postgresql://agroconnect@127.0.0.1:5433/agroconnect?sslmode=disable` | Connected a database browser to the local container to look at the tables |
| Edited `AppDbContext.cs`, deleted the uncommitted migration, then `dotnet dotnet-ef migrations add InitialSchema --project Services/Libs/Data --startup-project APIs/agroconnect-api --output-dir Migrations` | Database clean-up (ADR 0023): snake_case names and six foreign keys, regenerated as the first migration (nothing had been committed or deployed yet) |
| `docker compose -f docker-compose.dev.yml down -v` then `up -d db` | Deleted the local database volume and started an empty one, so the new first migration could run from scratch |
| `dotnet run ...`, then sign-in as officer `0240000001` and farmer `0240001234` | Live check of the new schema: tokens now expire after 7 days (ADR 0022); Ama's farmer account was created and linked (`users.farmer_id`) |
| `select conname ... from pg_constraint where contype = 'f'` | Listed the six links the database now enforces |
