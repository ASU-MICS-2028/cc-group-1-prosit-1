# Infrastructure: what is live and how to run it

Living file for the AWS setup. Design and reasons: [ADR 0026](adr/0026-private-network-and-autoscaling.md). Terraform and step-by-step commands: [`deploy/terraform/README.md`](../deploy/terraform/README.md).

_Last updated: 2026-10-07 (production switched on)_

## Addresses

| Environment | URL | Notes |
|---|---|---|
| Production | http://agroconnect-2076557186.af-south-1.elb.amazonaws.com | Port 80. HTTPS once there is a domain and an ACM certificate |
| Staging | http://agroconnect-2076557186.af-south-1.elb.amazonaws.com:8080 | Port 8080 until staging has its own host name. Demo officer: 024 000 0001, code 123456 |
| Health check | `/health` on either | Passes through nginx to the API: `{"status":"ok","checks":{"database":"Healthy"}}` |

The old fixed IPs (15.240.151.93, 15.240.240.182) no longer exist.

## What runs where

AWS account 659500703236, region af-south-1 (Cape Town). Terraform profile: `agroconnect`.

```
internet ──► load balancer (public subnets, 2 zones)
                 │ port 80 only
                 ▼
             app servers (private app subnets, Auto Scaling, no public IP, no SSH)
                 │ 5432 only                     │ outbound only
                 ▼                               ▼
             RDS agroconnect-prod            fck-nat (public subnet) ──► internet
             (private db subnets,            S3 gateway endpoint ──► photo buckets
              no internet route)             ECR ◄── images (pulled with the server's IAM role)
```

| Part | Detail |
|---|---|
| Network | VPC `agroconnect` 10.20.0.0/16 in af-south-1a and 1b: public 10.20.0–1.0/24, app 10.20.10–11.0/24, db 10.20.20–21.0/24 |
| Load balancer | `agroconnect`, one for both environments; health check `GET /health` every 15 s |
| Production servers | Auto Scaling group `agroconnect-production`: **min 2, desired 2, max 4** t3.micro, one per zone; adds servers when average CPU stays above 60% |
| Staging servers | Auto Scaling group `agroconnect-staging`: **exactly 1** t3.micro; replaced automatically if it fails |
| Outbound internet | fck-nat on a t4g.nano (Auto Scaling group of 1, high-availability mode) |
| Database | RDS PostgreSQL 17 `agroconnect-prod`, db.t3.micro, single zone, encrypted, 7-day backups, deletion protection on. Staging uses a PostgreSQL container on its server (demo data, re-seeded if the server is replaced) |
| Images | ECR `agroconnect/backend`, `agroconnect/frontend` (last 30 kept, scanned on push) |
| Photos | S3 `agroconnect-<env>-photos-659500703236`: private, encrypted, HTTPS only, uploads only from `photo_upload_origins` |
| Config and secrets | SSM Parameter Store `/agroconnect/<env>/dotenv` (the `.env`), `/agroconnect/<env>/image_tag` (last deployed version) |
| Alarms | CloudWatch → SNS topic `agroconnect-alerts` → email (confirmed). Per environment: a server unhealthy for 10 minutes (alert only), no healthy server (alert and recovery), more than 20 server errors in 5 minutes |
| Budget | $100 a month, alerts at 50%, 80%, 100% and forecast 100% |

## Versions

| Environment | Running | Recorded in |
|---|---|---|
| Production | `sha-1355e3e` | `/agroconnect/production/image_tag` |
| Staging | `sha-75c52f7` | `/agroconnect/staging/image_tag` |

## How to run it

**Deploy.** Merge to `staging` (deploys automatically) or `main` (waits for the DevOps lead's approval in GitHub). The workflow builds to GHCR, copies the images to ECR, rolls out to every server of the environment one at a time through SSM, then records the version. If an environment has no servers, the deploy only records the version.

**Roll back.** Actions → Deploy → Run workflow → pick the environment and an older tag (e.g. `sha-75c52f7`). Images stay in ECR (last 30).

**New servers.** Auto Scaling starts them for scale-out, replacement or instance refresh. Each one installs Docker, reads its `.env` and recorded version from SSM, pulls from ECR and starts the app (`deploy/server-boot.sh.tftpl`, log in `/var/log/agroconnect-boot.log`). A boot takes 5 to 8 minutes; the load balancer may not judge a server for its first 15 minutes (health-check grace period).

**Turn an environment on or off.** `running = true/false` in `deploy/terraform/terraform.tfvars`, then `terraform apply`. Off = 0 servers, nothing destroyed. The load balancer, fck-nat and RDS keep running.

**Change the number of servers.** `min_size` / `max_size` in `terraform.tfvars`, then `terraform apply`.

**Shell on a server.** No SSH and no public IPs. `terraform output shell_access` lists the commands (Session Manager).

**Alarm email arrives.** Check the target group health in the console, then the server's boot log or `docker compose logs` through Session Manager. Auto Scaling replaces unhealthy servers on its own.

## Cost (af-south-1 on-demand, light traffic)

About **$90 a month** with both environments on (load balancer $23, its IPs $7, fck-nat $8, production 2 × t3.micro $21, staging $11, RDS $20). Month to date on 2026-10-07: $6.10. Breakdown: `deploy/terraform/README.md`.

## Migration log (default VPC → private network)

Times are UTC and approximate.

| When | What |
|---|---|
| 2026-10-05 | ADR 0026 and Terraform drafted (PR #38); `terraform plan` checked against the account |
| 2026-10-06 00:10 | Snapshot `agroconnect-production-move` of the old database |
| 2026-10-06 00:15 | ECR repositories created; staging's running images (`sha-7b6e77c`) copied into ECR; version recorded |
| 2026-10-06 01:00 | Main apply: VPC, fck-nat, load balancer, Auto Scaling groups, `agroconnect-prod` restored from the snapshot; old servers and fixed IPs removed. One retry needed: fck-nat's first launch failed while a new IAM role propagated, and an old database rule blocked the old web security group |
| 2026-10-06 01:33 | Staging healthy on the new setup; sign-in checked end to end |
| 2026-10-06 01:40 | PR #38 merged; first deploy with the new pipeline (staging, `sha-9663cff`): `/health` reaches the API, nginx sees real client addresses |
| 2026-10-06 | PR #40: deploys to an environment with no servers record the version |
| 2026-10-07 | Production deploy approved (`sha-1355e3e`); production switched on (2 servers); production alarms created |
| 2026-10-07 18:06–18:25 | Burst of alarm emails: one new production server in each try stalled on its first `apt-get update` (no timeout by default, Ubuntu's own first-boot updates competing), missed the 7-minute grace period and was replaced, three times; each failure and recovery sent an email. The other server and the site stayed up. Root cause: `security.ubuntu.com` is unreachable from the NAT, so apt waited through long timeouts. Fix: security updates come from the regional EC2 mirror; the boot script also pauses Ubuntu's background updates, gives apt timeouts and retries, and retries the Docker install; grace period 15 minutes; the unhealthy-server alarm waits 10 minutes and sends no recovery email |
| 2026-10-07 | Old database `agroconnect-production` deleted (final snapshot `agroconnect-production-final-2026-10-07`), with its subnet group and security group |

Snapshots kept: `agroconnect-production-move`, `agroconnect-production-final-2026-10-07` (the old database before the move; small storage cost).

## Still to do

- **HTTPS:** register a domain, request an ACM certificate in af-south-1, set `certificate_arn` and point the domain at the load balancer. Needed for the PWA on real phones.
- **Staging host name:** set `host` for staging once there is a domain, so it no longer needs port 8080.
- **Sign-in rate limit with 2+ servers** is counted per server (per-phone limits are shared in PostgreSQL). Move the per-address counter to PostgreSQL if abuse shows up.
- **Optional:** RDS Multi-AZ (`rds_multi_az = true`, about +$16 a month).
