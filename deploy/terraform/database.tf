# Production PostgreSQL (RDS) in the private db subnets (ADR 0026): no public IP, no route
# to the internet, reachable only from the app servers' security group.
#
# Moving from the default network: RDS cannot change networks in place, so this creates
# a new database (agroconnect-prod) from a snapshot of the old one (rds_restore_snapshot).
# The old database is released from Terraform without being deleted (removed blocks
# below); delete it by hand once the new one is checked. Steps: README.md.

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

resource "aws_db_subnet_group" "private" {
  count      = var.enable_rds ? 1 : 0
  name       = "agroconnect-private"
  subnet_ids = aws_subnet.db[*].id
}

resource "aws_db_instance" "main" {
  count = var.enable_rds ? 1 : 0

  identifier                  = "agroconnect-prod"
  engine                      = "postgres"
  engine_version              = "17" # same major as the dev and staging containers
  allow_major_version_upgrade = true
  instance_class              = var.rds_instance_class

  # Restoring from a snapshot keeps its data and its master password, which is the
  # same value as random_password.db, so the app's connection string does not change.
  snapshot_identifier = var.rds_restore_snapshot

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.rds_restore_snapshot == null ? "agroconnect" : null
  username = "agroconnect"
  password = random_password.db[0].result

  db_subnet_group_name   = aws_db_subnet_group.private[0].name
  vpc_security_group_ids = [aws_security_group.database[0].id]
  publicly_accessible    = false
  multi_az               = var.rds_multi_az

  backup_retention_period   = 7
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "agroconnect-prod-final"

  auto_minor_version_upgrade = true
  apply_immediately          = true

  lifecycle {
    ignore_changes = [snapshot_identifier] # only used when the database is first created
  }

  tags = { Environment = "production" }
}

# The database and its network pieces in the default VPC: stop managing them, keep them.
removed {
  from = aws_db_instance.production
  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_db_subnet_group.main
  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_security_group.db
  lifecycle {
    destroy = false
  }
}

removed {
  from = aws_vpc_security_group_ingress_rule.db_from_web
  lifecycle {
    destroy = false
  }
}
