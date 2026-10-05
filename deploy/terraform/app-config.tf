# The .env each server runs with, stored encrypted in SSM Parameter Store
# (/agroconnect/<env>/dotenv). The deploy workflow writes it to
# /opt/agroconnect/.env on every roll-out, so config changes go through
# Terraform and secrets never touch the repo.

# Staging's PostgreSQL runs in a container next to the app (profile "localdb"
# in deploy/docker-compose.yml); production uses RDS (database.tf).
resource "random_password" "staging_db" {
  length  = 32
  special = false
}

locals {
  db_settings = {
    staging = [
      "COMPOSE_PROFILES=localdb",
      "POSTGRES_USER=agroconnect",
      "POSTGRES_DB=agroconnect",
      "POSTGRES_PASSWORD=${random_password.staging_db.result}",
      "ConnectionStrings__Default=Host=db;Port=5432;Database=agroconnect;Username=agroconnect;Password=${random_password.staging_db.result}",
    ]
    production = var.enable_rds ? [
      "ConnectionStrings__Default=Host=${aws_db_instance.production[0].address};Port=5432;Database=agroconnect;Username=agroconnect;Password=${random_password.db[0].result};SSL Mode=Require",
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
  ], local.db_settings[each.key]))}\n"
}
