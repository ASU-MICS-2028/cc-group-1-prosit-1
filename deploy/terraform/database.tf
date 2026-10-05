# Production database (Section 7.2). Staging keeps PostgreSQL in a container on
# its VM (see app-config.tf and deploy/docker-compose.yml). The master password is generated here and kept in SSM Parameter
# Store (encrypted); it never appears in code.

resource "random_password" "db" {
  count   = var.enable_rds ? 1 : 0
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  count = var.enable_rds ? 1 : 0
  name  = "/agroconnect/production/db/password"
  type  = "SecureString"
  value = random_password.db[0].result
}

resource "aws_db_subnet_group" "main" {
  count      = var.enable_rds ? 1 : 0
  name       = "agroconnect"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_db_instance" "production" {
  count = var.enable_rds ? 1 : 0

  identifier     = "agroconnect-production"
  engine         = "postgres"
  engine_version = "17" # same major as the dev and staging containers

  allow_major_version_upgrade = true
  instance_class              = var.rds_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "agroconnect"
  username = "agroconnect"
  password = random_password.db[0].result

  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.db[0].id]
  publicly_accessible    = false
  multi_az               = false # single AZ in Phase 1 (documented trade-off)

  backup_retention_period   = 7
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "agroconnect-production-final"

  auto_minor_version_upgrade = true
  apply_immediately          = true

  tags = { Environment = "production" }
}
