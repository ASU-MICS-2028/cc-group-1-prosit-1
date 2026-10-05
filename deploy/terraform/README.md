# AWS infrastructure (Terraform)

Everything AgroConnect runs on in AWS (af-south-1, Cape Town):

| File | What it creates |
|---|---|
| `ec2.tf` | One Ubuntu 24.04 VM per environment (staging, production) with a fixed public IP, set up by `../ec2-bootstrap.sh` |
| `network.tf` | Security groups: web (80/443 open, SSH closed unless allowed) and database (5432 from the web servers only) |
| `database.tf` | Production PostgreSQL 16 on RDS (private, encrypted, 7-day backups); password in SSM Parameter Store |
| `storage.tf` | One private S3 bucket per environment for photos |
| `iam.tf` | Server roles (Session Manager + photo bucket) and the GitHub Actions deploy role (OIDC, no stored AWS keys) |
| `budget.tf` | Monthly cost budget with email alerts at 50%, 80%, 100% and forecast 100% |
| `bootstrap/` | The S3 bucket that holds the Terraform state (applied once, already done) |

## First time

```sh
export AWS_PROFILE=<your profile>
cp terraform.tfvars.example terraform.tfvars   # fill in emails and deploy public keys
terraform init
terraform plan
```

`terraform.tfvars` is git-ignored. State is shared in S3 with locking, so only one person can apply at a time.

## Turning servers on and off

In `terraform.tfvars`, set `running = true` or `false` per environment, then `terraform apply`.
Stopping keeps the disks and public IPs.

The database is started and stopped outside Terraform (AWS restarts a stopped database after 7 days):

```sh
aws rds stop-db-instance  --db-instance-identifier agroconnect-production --region af-south-1
aws rds start-db-instance --db-instance-identifier agroconnect-production --region af-south-1
```

## Getting a shell

SSH is closed by default. Use Session Manager, which works from any IP with your AWS login
(needs `brew install --cask session-manager-plugin` once):

```sh
terraform output shell_access
```

For real SSH, `./allow-my-ip.sh` opens port 22 to your current public IP only (run it again when your
IP changes; it replaces the old one). `./allow-my-ip.sh --close` closes it again.

## Useful outputs

`terraform output` shows the public IPs, instance IDs, photo bucket names, the RDS endpoint, the SSM
parameter holding the database password and the GitHub deploy role ARN.
