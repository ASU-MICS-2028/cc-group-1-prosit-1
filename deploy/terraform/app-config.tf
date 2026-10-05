# The .env each server runs with, stored encrypted in SSM Parameter Store
# (/agroconnect/<env>/dotenv). The deploy workflow writes it to
# /opt/agroconnect/.env on every roll-out, so config changes go through
# Terraform and secrets never touch the repo.

# Staging's PostgreSQL runs in a container next to the app (profile "localdb"
# in deploy/docker-compose.yml); production uses RDS (database.tf). Staging data is
# demo data: if Auto Scaling replaces the staging server, the database starts empty
# again and the demo accounts are re-seeded (ADR 0026).
resource "random_password" "staging_db" {
  length  = 32
  special = false
}

# HMAC key the API signs sign-in tokens with (Auth:SigningKey, at least 32 bytes).
resource "random_password" "auth_signing_key" {
  for_each = var.environments
  length   = 48
  special  = false
}

locals {
  # Staging is the demo: one fixed sign-in code (no SMS provider yet) and seeded demo
  # accounts, as in appsettings.Development.json. Production gets neither.
  demo_settings = {
    staging = [
      "Auth__FixedCode=123456",
      "Seed__Officers__0__FullName=Fuseini Alhassan",
      "Seed__Officers__0__Phone=+233240000001",
      "Seed__Officers__0__Region=Northern",
      "Seed__Officers__0__District=Savelugu",
      "Seed__SampleFarmer=true",
    ]
    production = []
  }

  db_settings = {
    staging = [
      "COMPOSE_PROFILES=localdb",
      "POSTGRES_USER=agroconnect",
      "POSTGRES_DB=agroconnect",
      "POSTGRES_PASSWORD=${random_password.staging_db.result}",
      "ConnectionStrings__Default=Host=db;Port=5432;Database=agroconnect;Username=agroconnect;Password=${random_password.staging_db.result}",
    ]
    production = var.enable_rds ? [
      "ConnectionStrings__Default=Host=${aws_db_instance.main[0].address};Port=5432;Database=agroconnect;Username=agroconnect;Password=${random_password.db[0].result};SSL Mode=Require",
    ] : []
  }
}

resource "aws_ssm_parameter" "dotenv" {
  for_each = var.environments
  name     = "/agroconnect/${each.key}/dotenv"
  type     = "SecureString"
  value = "${join("\n", concat([
    "ASPNETCORE_ENVIRONMENT=${title(each.key)}",
    "AWS_REGION=${var.region}",
    "PHOTOS_BUCKET=${aws_s3_bucket.photos[each.key].bucket}",
    "Auth__SigningKey=${random_password.auth_signing_key[each.key].result}",
    "Database__MigrateOnStartup=true",
  ], local.db_settings[each.key], lookup(local.demo_settings, each.key, [])))}\n"
}

# Last image tag deployed to each environment. The deploy workflow writes it after a
# successful roll-out; servers that Auto Scaling starts later read it and run the same
# version (ADR 0026). "none" until the first deploy.
resource "aws_ssm_parameter" "image_tag" {
  for_each = var.environments
  name     = "/agroconnect/${each.key}/image_tag"
  type     = "String"
  value    = "none"

  lifecycle {
    ignore_changes = [value] # owned by the deploy workflow after creation
  }
}

# Lets new servers pull the private app images from GHCR without a deploy running.
# A GitHub token with read:packages only.
resource "aws_ssm_parameter" "ghcr" {
  for_each = var.environments
  name     = "/agroconnect/${each.key}/ghcr"
  type     = "SecureString"
  value    = "${var.ghcr_pull_user}:${var.ghcr_pull_token}"
}
