# AWS infrastructure (Terraform)

Everything AgroConnect runs on in AWS (af-south-1, Cape Town). Design and reasons: [ADR 0026](../../docs/adr/0026-private-network-and-autoscaling.md).

```
internet ──► load balancer (public subnets, 2 zones)
                 │ port 80 only
                 ▼
             app servers (private app subnets, Auto Scaling, no public IP, no SSH)
                 │ 5432 only                     │ outbound only
                 ▼                               ▼
             RDS (private db subnets,        fck-nat (public subnet) ──► internet
                  no internet route)         S3 gateway endpoint ──► photo buckets
```

| File | What it creates |
|---|---|
| `network.tf` | The AgroConnect VPC: public, app and db subnets in two zones, route tables, the free S3 gateway endpoint, security groups (load balancer → app → database) |
| `nat.tf` | fck-nat: a t4g.nano NAT instance (high-availability mode) for the app servers' outbound traffic |
| `alb.tf` | One load balancer for both environments, health checks on `/health`, HTTPS when `certificate_arn` is set |
| `asg.tf` | One Auto Scaling group per environment (production 2 to 4, staging 1), scaling on CPU; servers set themselves up with `../server-boot.sh.tftpl` |
| `database.tf` | Production PostgreSQL 17 on RDS in the db subnets (private, encrypted, 7-day backups, optional Multi-AZ); password in SSM |
| `storage.tf` | One private S3 bucket per environment for photos; HTTPS only; uploads only from `photo_upload_origins` |
| `app-config.tf` | Each server's `.env`, the last deployed image tag and the image pull token, in SSM Parameter Store |
| `iam.tf` | Server roles (Session Manager, photo bucket, own config) and the GitHub Actions deploy role (OIDC, no stored AWS keys) |
| `budget.tf` | Monthly cost budget with email alerts at 50%, 80%, 100% and forecast 100% |
| `bootstrap/` | The S3 bucket that holds the Terraform state (applied once, already done) |

## First time

```sh
export AWS_PROFILE=<the AgroConnect account's profile>
cp terraform.tfvars.example terraform.tfvars   # fill in emails and the GHCR pull token
terraform init
terraform plan
```

`terraform.tfvars` is git-ignored. State is shared in S3 with locking, so only one person can apply at a time.

## How servers start and deploy

- A new server (scale-out, replacement, or instance refresh) runs `server-boot.sh.tftpl`: it installs Docker, reads its `.env`, the GHCR token and the last deployed image tag from SSM, and starts the app. No SSH and no deploy needed.
- The deploy workflow (`.github/workflows/deploy.yml`) finds every running server of the environment, rolls out to them one at a time through SSM, then writes the new tag to `/agroconnect/<env>/image_tag`.
- The load balancer only sends traffic to servers whose `/health` answers 200. Auto Scaling replaces servers that stay unhealthy.

## Turning environments on and off

In `terraform.tfvars`, set `running = true` or `false` per environment, then `terraform apply`. `false` scales the group to 0 servers; nothing is destroyed. The load balancer and fck-nat keep running (and costing) while the environment is off.

The database is started and stopped outside Terraform (AWS restarts a stopped database after 7 days):

```sh
aws rds stop-db-instance  --db-instance-identifier agroconnect-prod --region af-south-1
aws rds start-db-instance --db-instance-identifier agroconnect-prod --region af-south-1
```

## Getting a shell

Servers have no public IP and port 22 is closed. Use Session Manager (needs `brew install --cask session-manager-plugin` once):

```sh
terraform output shell_access   # how to list the servers and open a session
```

## Moving from the default VPC (one time)

The first apply of this version replaces the old setup. Plan a short downtime window.

1. **Snapshot the current database:**
   ```sh
   aws rds create-db-snapshot --region af-south-1 \
     --db-instance-identifier agroconnect-production --db-snapshot-identifier agroconnect-production-move
   aws rds wait db-snapshot-available --region af-south-1 --db-snapshot-identifier agroconnect-production-move
   ```
2. In `terraform.tfvars`, set `rds_restore_snapshot = "agroconnect-production-move"` and fill in the new variables (`ghcr_pull_user`, `ghcr_pull_token`, the new `environments` shape).
3. `terraform plan`. Expect: the new VPC, subnets, fck-nat, load balancer, Auto Scaling groups and `agroconnect-prod` created; the two old instances, their public IPs and the old web security group destroyed; the old database, its subnet group and security group **released, not destroyed** (`removed` blocks in `database.tf`).
4. `terraform apply`, then run the deploy workflow for each environment so the image tag is recorded and the servers start the app.
5. Check the app on `terraform output app_url` and the data in the new database.
6. Only then delete the old database by hand (turn off its deletion protection first), and its old subnet group and security group.

After the move, remove `rds_restore_snapshot` from `terraform.tfvars` (it is ignored after creation either way).

## Things to know

- **The staging database is disposable.** It runs in a container on the staging server; if Auto Scaling replaces that server, staging starts with an empty database and re-seeded demo accounts.
- **fck-nat is one instance.** If it fails, a replacement takes over in about 1 to 2 minutes; during that time the servers cannot reach the internet (users are not affected).
- **HTTPS needs a domain.** Request an ACM certificate in af-south-1, set `certificate_arn`, and point the domain at `load_balancer_dns`.
- **Cost:** the load balancer and fck-nat run all the time, and production runs at least two servers. Check the AWS Pricing Calculator against `budget_limit_usd` before applying.
