# Deployment runbook

Owned by the DevOps lead (@Xenongt1). Changes to this folder need their review.

## Environments

| Environment | Branch    | EC2 instance        | Deploys                          |
|-------------|-----------|---------------------|----------------------------------|
| staging     | `staging` | staging instance    | automatically on merge           |
| production  | `main`    | production instance | on merge, after manual approval  |

`development` is never deployed. Developers run the stack locally.

Staging and production run on **separate EC2 instances**, so a bad deploy, a
heavy QA test or a broken migration on staging can never take production down,
and each environment has its own secrets and database.

## Pipeline

```
PR opened ──▶ CI (lint, unit tests ≥70% coverage, docker build, branch flow)
merge to staging ──▶ build images ──▶ push to GHCR ──▶ SSH to staging EC2 ──▶ health check
merge to main    ──▶ build images ──▶ push to GHCR ──▶ wait for approval ──▶ SSH to prod EC2 ──▶ health check
```

Images: `ghcr.io/asu-mics-2028/cc-group-1-prosit-1/<service>:sha-<commit>`.
If the health check (`GET /health` on the backend) fails, the server rolls
back to the previous tag automatically and the workflow fails.

## Setting up an instance (one time per environment)

1. **Launch EC2**: Ubuntu 24.04, `t3.small` (or `t2.micro` on free tier for staging).
   Security group:
   - 22/tcp: SSH (GitHub-hosted runners have no fixed IPs, so this must be open;
     password login is disabled by the bootstrap script, key-only)
   - 80/tcp (and 443 once TLS is added): from anywhere
2. **Create a deploy key pair** on your laptop (one per environment):
   ```bash
   ssh-keygen -t ed25519 -C "gha-staging" -f ~/.ssh/agroconnect_staging -N ""
   ```
3. **Bootstrap the instance**:
   ```bash
   ssh ubuntu@<ip>
   curl -fsSL https://raw.githubusercontent.com/ASU-MICS-2028/cc-group-1-prosit-1/main/deploy/ec2-bootstrap.sh -o bootstrap.sh
   sudo bash bootstrap.sh "$(cat agroconnect_staging.pub)"   # paste the .pub contents
   ```
4. **Add app secrets** on the server in `/opt/agroconnect/.env` (DB URL, API keys).
5. **Add GitHub environment secrets** (Settings → Environments → staging / production):
   ```bash
   gh secret set EC2_HOST    --env staging --body "<public ip or dns>"
   gh secret set EC2_USER    --env staging --body "deploy"
   gh secret set EC2_SSH_KEY --env staging < ~/.ssh/agroconnect_staging
   ```
   Repeat with `--env production` and the production key.

Until these secrets exist, the deploy job skips with a warning.

## Rolling back

Actions → **Deploy** → *Run workflow* → pick the environment and enter a
previous image tag (e.g. `sha-1a2b3c4`, listed in earlier deploy summaries).
Production rollbacks still need approval.

## Hotfixes

```
main ──▶ hotfix/<name> ──PR──▶ main  (deploys to production)
                       └──PR──▶ development  (so the fix isn't lost)
```
