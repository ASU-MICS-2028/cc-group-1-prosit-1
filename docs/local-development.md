# Running AgroConnect on your laptop, and the cloud ideas behind it

A hands-on guide: every command we use, what it does, and why. Your laptop runs the same pieces as the servers, in the same way (in containers), so each command here teaches a cloud idea you will meet again on EC2.

_Last updated: 7 October 2026. Commands are for Windows (PowerShell or Git Bash). Run backend commands from `backend/` and frontend commands from `frontend/`._

> **Test sign-ins (laptop only)**
>
> | Who are you? | Phone | Code | Opens |
> |---|---|---|---|
> | Extension officer (Fuseini Alhassan) | `024 000 0001` | `123456` | Officer app at `/` |
> | Farmer (Ama Boateng) | `024 000 1234` | `123456` | Farmer app at `/farmer` |
> | MoFA admin (Esi Owusu, Northern Region), **on a computer** | `024 000 0009` | `123456` | Admin Overview at `/admin` (on a phone: "Admin works on a computer") |
>
> - These accounts are created by the API when it starts on a laptop (`Seed` in `backend/APIs/agroconnect-api/appsettings.Development.json`).
> - **Mobile money (ADR 0034):** with the Paystack test key in user-secrets (5.11), the farmer's Money pages use Paystack test mode; without it they show "Sample data" and a payment is approved by itself after a few seconds.
> - The code is always `123456` on a laptop (`Auth:FixedCode`). It never works on the servers, which send real SMS.
> - The phone number must match the role: the officer's number does not open the farmer app.
> - A farmer you register in the app can sign in once their record reaches the server: as the officer, open **Sync** and tap **Sync now** (it also sends by itself when the app opens). Then sign in as a farmer with the number you registered, code `123456` (section 5.8).
> - A sign-in lasts 1 hour on a laptop (`Auth:TokenLifetime`). To see the sign-in screens again sooner, use Profile → Log out, or open a private window (`Ctrl+Shift+N`).
> - The farmer app (Home, My details, Market, Weather, Check my crop, Harvest, Cooperative, Lessons) reads `/api/farmer/...`. Restart the API after pulling so it has the farmer endpoints. Answers marked "Sample data" come from sample providers (ADR 0031); all of them can be tried in Swagger (`/swagger`, section *Farmer*) after signing in as the farmer.

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

### 5.0 The quick way: VS Code tasks

Everything below can be started from VS Code with one click, each part in **its own terminal** so you can see its log:
1. Make sure **Docker Desktop** is running.
2. Press `Ctrl+Shift+P`, type **Tasks: Run Task**, and choose **Start everything (database, API, app)**.
3. Three things happen: the database starts in Docker; a terminal named **API: run** shows the API's log; a terminal named **App: run** shows the app's log.
4. Open the app at `http://localhost:5173` and Swagger UI at `http://localhost:8000/swagger`.
5. To stop the API or the app, click into its terminal and press `Ctrl+C`. To stop the database, run the task **Database: stop**. Your data stays.

The tasks are defined in [`.vscode/tasks.json`](../.vscode/tasks.json), which is in the repository, so every team member gets them. Each one runs a command from the sections below. The first time on a new laptop (or after new packages are added), run **First-time setup (install packages and tools)** once; it needs Docker Desktop, the .NET 10 SDK and Node 24 installed. Other tasks: **Database: start**, **API: run**, **App: run**, and **App: update API types** (after an API change).

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

**The easiest way: Swagger UI.** Open `http://localhost:8000/swagger` in a browser. It lists every endpoint, with its inputs and answers, and a **Try it out** button.

To try a signed-in endpoint such as `GET /api/me`:
1. `POST /api/auth/code` → **Try it out** → body `{ "phone": "0240000001", "role": "officer" }` → **Execute**. Answer: `202`.
2. `POST /api/auth/verify` → body `{ "phone": "0240000001", "role": "officer", "code": "123456" }` → **Execute**. Copy the `token` from the answer.
3. Click **Authorize** (top right, or the padlock on an endpoint), paste the token, then **Authorize**. Endpoints that need sign-in show a padlock.
4. `GET /api/me` → **Try it out** → **Execute**. Answer: Fuseini Alhassan.

Notes:
- **Only on laptops:** Swagger UI and the contract (`/openapi/v1.json`) exist only in **Development**. On staging and production they are switched off on purpose, so the API does not describe itself to the internet. A test checks this.
- **Same rules as the app:** Swagger UI calls the same API, so limits apply. Asking for a code twice within 45 seconds gives `429`.

**Other ways:** `http://localhost:8000/health` in a browser, or PowerShell as below.

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

### 5.5 Run the app together with the API

With the database (5.1) and the API (5.3) running, start the app in a second terminal:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`. The first time, the app shows Welcome, then the language, then "Who are you?". Sign in:

| Who | Phone | Code |
|---|---|---|
| Officer (Fuseini Alhassan) | `024 000 0001` | `123456` |
| Farmer (Ama Boateng) | `024 000 1234` | `123456` |

**How the app reaches the API: the dev proxy.** The app calls paths like `/api/auth/code` on its own address. In `vite.config.ts`, `server.proxy` forwards every `/api/...` request from port 5173 to the API on port 8000. To use an API on another port, set `API_PROXY_TARGET`, for example `API_PROXY_TARGET=http://localhost:8001 npm run dev`.
- **Why:** on the servers, nginx does the same job (`frontend/.nginx/nginx.conf`), so the app code is identical on a laptop and in the cloud.
- **No CORS needed:** the browser only ever talks to one address, so the API needs no CORS (cross-origin) rules.
- **The setting:** `VITE_API_BASE_URL` in `.env.example` stays empty for this reason. Set it only to point a laptop at another server.
- **`VITE_HELP_LINE`** (optional): the MoFA help line number. When set at build time, Help shows "Call" and "Send us an SMS"; when empty those rows are hidden, so the app never shows a made-up number.

**Keeping the app and the API in agreement:** after any change to the API, rebuild it (which rewrites `backend/openapi/agroconnect.json`), then from `frontend/`:
```powershell
npm run api:types
```
This regenerates `src/api/schema.d.ts`, the TypeScript description of every request and response. If a field was renamed on the server, the app now fails to build, so the mismatch is caught on the laptop and not on a farmer's phone.

**Where the sign-in is kept:** after "Verify", the token and the person are saved in the browser's local storage (`agroconnect.session`) until the token ends, so the app keeps working offline. To start again as a new user, use Profile → Log out, or clear the site data in the browser.

**How long a sign-in lasts:** one setting on the API, `Auth:TokenLifetime`, written as `days.hours:minutes:seconds`. On a laptop it is `01:00:00` (1 hour, in `backend/APIs/agroconnect-api/appsettings.Development.json`), so you see the sign-in screens often while testing. On the servers it is the default, `7.00:00:00` (7 days, ADR 0022). After changing it, restart the API; a token already given out keeps its old end time, so log out once to get a new one.

### 5.6 Check the phone, tablet and computer layouts

The app picks its layout from the **width of the screen** (Tailwind's `md` breakpoint), never from the kind of device. The team's rule ("Phone vs Desktop"): one app, the width picks the layout, the signed-in role picks the menus.

| Width | Layout | Figma |
|---|---|---|
| under 768 px (phones) | Phone design, edge to edge, main button at the bottom | P1 phone screens (00, 01, 01b, 02a to 02d) |
| 768 px and up (tablets, laptops, PCs) | Desktop design: cream brand panel on the left, the form on the right; wider details (bigger code boxes) from 1024 px | D01 Choose Language, D02 Login, D03 Enter Code; Welcome and Who are you follow the same pattern |
| Registration form | Under 768 px: the phone design with Back and Next at the bottom. From 768 px: a top bar with "Save and exit", questions side by side, Back and Next bottom right. From 1024 px: the cream guide panel with the list of steps | Phone 04 to 12, 19, 28; computer D07 to D15 |

The three sizes to check: **390 × 844** (phone), **768 × 1024** (first desktop size), **1440 × 900** (desktop).

How to check all three on one computer:
1. Open the app (`http://localhost:5173`) in Chrome or Edge at full width: you see the **desktop** design.
2. Make the window narrower by dragging its edge: below 768 px the layout switches to the phone design. DevTools docked at the side also narrows the page, so the layout may switch when it opens; dock it at the bottom to keep the full width.
3. For exact sizes, open **DevTools** (`F12`) and click the **device toolbar** icon (`Ctrl+Shift+M`). Pick **Responsive** and type 390 × 844, 768 × 1024 or 1440 × 900.
4. On a real phone on the same Wi-Fi: run the app with `npm run dev -- --host` (in `frontend/`) and open the "Network" address it prints, e.g. `http://192.168.1.20:5173`. Windows may ask to allow Node.js through the firewall; allow it for private networks only. GPS and the camera will not work this way (they need HTTPS); everything else does.

### 5.7 Run the tests

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

### 5.8 Try the registration form, and look at the phone's database

1. Start everything (5.0), sign in as the demo officer (`024 000 0001`, code `123456`), then tap **Register a farmer**.
2. Go through the steps. The address shows the step (`/register?step=3`), so the browser's back button goes back one step.
3. After "Yes, I agree", each answer is kept half a second after you stop typing ("Draft saved"). Close the tab and open `/register` again: the form reopens at the same step.
4. Save the farmer. It appears at once on Home, Farmers and Sync as "waiting".
5. Register a second farmer with the same phone number to see "Check before saving".
6. **Send it to the server:** open **Sync** and tap **Sync now**. The farmer becomes "Sent" and leaves the queue. Then log out and sign in as **Farmer** with the number you registered (code `123456`): the farmer app opens with their farm and you as their officer (ADR 0032).
7. **See a refused record:** in DevTools, Application, IndexedDB, `farmers`, change a waiting farmer's `phoneE164` to `+23324`, then Sync now. It comes back under **Needs fixing** with the reason.

In Swagger (`/swagger`, section *Sync*) you can send a batch by hand after signing in as the officer; sending the same batch twice answers `unchanged`.

**See what is stored on the "phone":** DevTools (`F12`), tab **Application**, then **Storage, IndexedDB, agroconnect**. The four tables are `farmers`, `photos`, `outbox` and `drafts` (data dictionary 4.7). Click a table to see its rows. **Clear site data** (Application, Storage) empties it and also signs you out.

**GPS and the camera:** browsers allow them only on HTTPS or on `localhost`. On the laptop at `http://localhost:5173` they work: the browser asks for location, and "Take a photo" opens the file picker. On a phone over the Wi-Fi address (`http://192.168...`) they are blocked until the servers have HTTPS; the form still works without them.

### 5.11 Mobile money with Paystack (test mode)

The secret key stays out of the repository. Store it once in .NET's secret store on your laptop (from `backend/`):

```
dotnet user-secrets set "Paystack:SecretKey" "sk_test_..." --project APIs/agroconnect-api
dotnet user-secrets list --project APIs/agroconnect-api
```

- **User-secrets** are kept in your user profile, not in the project folder, and are only read when the API runs as Development. On the servers the same setting is the environment variable `Paystack__SecretKey` (the DevOps lead adds it as a secret).
- Restart the API. It applies the `AddMobileMoney` migration and now sends payments to Paystack in test mode.
- Sign in as the farmer, open Money → Link mobile money → choose the network → Link. Then Buy inputs → Check and pay → Pay. The app shows *Approve the payment* and checks with the server every 3 seconds.
- In test mode no real prompt reaches a phone. Use the test mobile money numbers from Paystack's *Test payments* page; payments then appear in the Paystack dashboard under Transactions (test mode).
- Remove the key (`dotnet user-secrets remove "Paystack:SecretKey" --project APIs/agroconnect-api`) to go back to the sample provider.

### 5.9 Stop things

| Command | Effect | Data |
|---|---|---|
| `Ctrl+C` in the API terminal | Stops the API | Kept |
| `docker compose -f docker-compose.dev.yml stop` | Stops the containers | Kept |
| `docker compose -f docker-compose.dev.yml down` | Stops and **removes** the containers | Kept (the volume stays) |
| `docker compose -f docker-compose.dev.yml down -v` | Also deletes the volume | **Deleted.** Next start is an empty database; the API recreates tables and demo data. Use it to start fresh. |

### 5.10 Test the installable app (PWA)

`npm run dev` (port 5173) is the workshop: quick, with live changes, but **without** the service worker, so it is a website. To test the real installable app, build it and serve the finished files (ADR 0028):

```powershell
cd frontend
npm run build      # the finished app in dist/, with sw.js (the service worker) and manifest.webmanifest
npm run preview    # serves dist/ at http://localhost:4173, as the server will
```

In Chrome at `http://localhost:4173` (sign-in needs the API running, 5.3):
1. **Install:** click the install icon at the right of the address bar, or "Install" on the app's own card. AgroConnect opens in its own window and gets a Start menu icon.
2. **Look inside:** `F12` → **Application**: *Manifest* (name, icons, any installability warning), *Service workers* ("activated and running"), *Cache storage* (about 70 saved files), *IndexedDB → agroconnect* (saved farmers).
3. **Offline:** tick **Offline** under Application → Service workers, or stop `npm run preview`, then reload. The app must open and still register a farmer.
4. **Slow network:** `F12` → Network → **Slow 3G**.
5. **Updates:** change a text, `npm run build` again, and the open app shows "A new version is ready".
6. **Score:** `F12` → **Lighthouse** → Analyze (installability, offline, speed, accessibility).
7. **Start again:** Application → Storage → **Clear site data** removes the service worker, the saved files, the phone database and the sign-in.

**On a real Android phone, from the laptop (USB):** phones only install from secure addresses, and `localhost` counts as secure.
1. Phone: Settings → About phone → tap **Build number** 7 times; then Developer options → **USB debugging** on. Connect the USB cable and accept the prompt.
2. Laptop Chrome: `chrome://inspect/#devices` → **Port forwarding** → add `4173` → `localhost:4173` → tick "Enable port forwarding". That one port is enough: `npm run preview` forwards `/api` to the API on the laptop (port 8000), like the dev server does, so sign-in works from the phone too.
3. Phone Chrome: open `http://localhost:4173`, install it, then test airplane mode, GPS and the camera. **Inspect** on `chrome://inspect` shows the phone's screen and errors on the laptop.

**App icons:** made from `public/app-icon.svg` with `npx @vite-pwa/assets-generator` and a small config (sizes 64, 192, 512, maskable 512 and Apple 180, no padding, brand green background). Run it again only when the icon changes.

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
| `git commit` says `error: pathspec '<your message>' did not match any file(s)` | In PowerShell, `git commit -F - @'...'@` passes the message as a file name instead of feeding it in | Save the message to a file (e.g. inside `.git/`, which is never committed) and run `git commit -F <that file>`, or pipe it: `@'...'@ \| git commit -F -` |
| "Sync now" says it could not send | The server's farmer service (`POST /api/sync`) is not built yet, or there is no network | Nothing is lost: farmers and visits stay queued and are sent when the service is live (ADR 0029) |
| A farmer screen says "No network, and nothing is saved on this device yet" | The API running is an older build without the farmer endpoints (404), or it is not running | Stop the API and start it again (`dotnet run` from `backend/APIs/agroconnect-api`) |
| You want a clean database | Old test data | `docker compose -f docker-compose.dev.yml down -v`, then `up -d db`, then restart the API |
| The registration form opens in the middle, or old farmers show on Home | The app's own database in the browser keeps drafts and saved farmers (that is the point of offline-first) | DevTools, Application, Clear site data; or tap "No" on the consent step to drop the draft |
| "Location is turned off for this app" | The browser was told not to share location, or the page is not on HTTPS or `localhost` | Allow location in the address bar's site settings, or go on without it (it is optional) |

---

## 11. Log: what was run and why

### 5 October

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
| `npm run api:types` | Generated the app's TypeScript types from the API contract (sign-in requests and answers) |
| `npm run dev`, then `curl -X POST localhost:5173/api/auth/code ...` | Checked the dev proxy: a request to the app's address reached the API (answer `202`) |
| Added Swagger UI (`/swagger`, Development only) and the Bearer token scheme to the contract | So every endpoint can be tried from the browser, including signed-in ones |
| Added `.vscode/tasks.json` (Start everything, Database, API, App, Update API types) | So the database, API and app are started in visible terminals with their logs, not hidden |
| Screenshots of every start screen at 390 px, 820 px and 1440 × 900 | Checked the new desktop layout (Figma D01 to D03) and the phone and tablet layouts against the design |
| Moved the desktop layout to start at 768 px, then screenshots at 768 × 1024 | Follows the team's "Phone vs Desktop" rule (desktop from Tailwind `md`); the tablet card was removed |
| Headless Chrome walk-through of Welcome → Language → Who are you → Log in → Code → Home, officer and farmer | First live check of the app against the real API and database: wrong number, wrong code (server message shown), right code, farmer app, log out |

### 7 October

| Command | Why |
|---|---|
| `npm install -D fake-indexeddb` (in `frontend/`) | An in-memory IndexedDB for the tests, so saving a farmer is tested end to end without a browser |
| `npx tsc -b`, `npm run lint`, `npm run format:check` | Type check, lint rules and formatting of the registration form |
| `npm run test:ci` | All 93 frontend tests pass; 97.6% of lines covered (the CI gate is 70%) |
| `npm run build` | Production build: first screen about 130 KB gzipped; the registration form a separate 55 KB file, loaded only when opened |
| Changed `Auth:TokenLifetime` to a duration and set `01:00:00` in `appsettings.Development.json`; `dotnet test tests/AuthService.Tests` | Sign-ins on a laptop now last 1 hour instead of 7 days, so the sign-in screens are tested often; the servers keep 7 days. All 37 sign-in tests pass |
| `dotnet build -c Release`, `dotnet test -c Release` | The new FarmerService and its 25 tests (100% of lines); built in Release because the running API locks the Debug files |
| `npm run api:types` | Regenerated the app's types from the contract, now with the farmer endpoints |
| `dotnet sln AgroConnect.sln add --solution-folder Services Services/SyncService/SyncService.csproj` (and the same for `tests/SyncService.Tests`) | Adds the new SyncService and its tests to the solution, so `dotnet build` and CI include them |
| `dotnet test tests/SyncService.Tests -c Release -p:CollectCoverage=true -p:Threshold=70` | 41 sync tests against a real PostgreSQL in Docker; 99% of lines covered. In Git Bash write `-p:` instead of `/p:`, which the shell turns into a folder path |
| `dotnet test AgroConnect.sln -c Release`, `dotnet format --verify-no-changes` | All 190 backend tests pass, including the end-to-end test: an officer syncs a new farmer, who then signs in; formatting clean |
| `npm run api:types`, `npm run test:ci` | The app now uses the generated sync types and sends 100 records per request; 133 tests pass, 94.7% of lines covered |
| `ASPNETCORE_URLS=http://localhost:8001 dotnet bin/Release/net10.0/AgroConnect.Api.dll`, then `API_PROXY_TARGET=http://localhost:8001 npx vite --port 5174` | A second API with the new endpoints on port 8001, and a dev server pointing at it, while the usual API kept port 8000; used to screenshot the farmer app |
| Exported five pictures from Figma as SVG and shrank them with `npx svgo` (1.2 to 1.9 MB each down to 15 to 31 KB compressed) | The Home banner, "No farmers yet", Sync, Help and the farmer's banner, loaded only when shown |
| `npm run test:ci` after building every Phase 1 screen | 120 tests pass, 93.9% of lines covered; Sync is tested against a fake server |
| Headless Chrome screenshots of every new screen at 390, 768 and 1440 px | Compared with Figma; fixed the banner edges, the tablet header, the card order on the farmer page and the 24-hour clock |
| `npx vite --port 5173` and headless Chrome at 390 × 844, 768 × 1024 and 1440 × 900 | Screenshots of every registration screen (consent, the error state, each step, Check and save, the duplicate check, Saved) compared with Figma 04 to 12, 19, 28 and D07 to D15 |
| `cp design/assets/agro-illustrations/by-screen/<file>.svg frontend/public/illustrations/<name>.svg` (17 drawings) and the crop JPGs to `frontend/public/pictures/crops/`; `cmp` to confirm each copy is identical | The app now shows the design team's own files, byte for byte; `npx svgo` was tried and could not make them smaller, so nothing is re-encoded |
| `npm install` after a failed `npm ci` | `npm ci` deletes `node_modules` first; with `npm run dev` running, Windows locks one Vite file and the delete stops halfway. Stop the dev server before `npm ci`, or use `npm install` to repair |
| `dotnet test tests/AdminService.Tests`, `dotnet test tests/AuthService.Tests`, `dotnet test tests/Api.Tests` | Admin sign-in and the Overview: 4 AdminService tests (100% of lines), admin code and token tests, and end-to-end: the seeded admin signs in, cannot use officer endpoints, and every seeded officer is added |
| `ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://localhost:8001 dotnet AgroConnect.Api.dll` (from `bin/Release/net10.0`) and `API_PROXY_TARGET=http://localhost:8001 npx vite --port 5174` | A second copy of the new API and app beside the usual ones, to check the admin pages in Chrome; restart your own API (port 8000) to get the admin account |
| `dotnet user-secrets init --project APIs/agroconnect-api`, then `dotnet user-secrets set "Paystack:SecretKey" ...` | Gave the API project its own secret store (it had none) and put the Paystack test key there, outside the repository |
| `dotnet ef migrations add AddMobileMoney --project Services/Libs/Data --startup-project APIs/agroconnect-api` | The `wallets` and `payments` tables for mobile money (ADR 0034); applied by the API on start-up |
| `dotnet test tests/MoneyService.Tests` | 32 tests: the Paystack client against a fake Paystack (requests, network codes, statuses, errors), the sample provider, and every money endpoint on a real database; 99% of lines |
