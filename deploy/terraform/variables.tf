variable "region" {
  description = "AWS region (ADR 0001: Cape Town, closest AWS region to Ghana)."
  type        = string
  default     = "af-south-1"
}

variable "environments" {
  description = <<-EOT
    One Auto Scaling group, one photo bucket and one host name per environment (ADR 0026).
    running = false scales the group to 0 (no compute cost; nothing is destroyed).
    host    = the domain this environment answers on at the load balancer ("" = none yet).
  EOT
  type = map(object({
    instance_type = string
    running       = bool
    min_size      = number
    max_size      = number
    host          = string
  }))
  default = {
    staging    = { instance_type = "t3.micro", running = false, min_size = 1, max_size = 1, host = "" }
    production = { instance_type = "t3.micro", running = false, min_size = 2, max_size = 4, host = "" }
  }

  validation {
    condition     = alltrue([for e in values(var.environments) : e.min_size >= 1 && e.max_size >= e.min_size])
    error_message = "Each environment needs min_size >= 1 and max_size >= min_size (use running = false to scale to 0)."
  }
}

variable "vpc_cidr" {
  description = "Address range of the AgroConnect network. Split into public, app and database subnets in two zones."
  type        = string
  default     = "10.20.0.0/16"
}

variable "cpu_target_percent" {
  description = "Auto Scaling keeps the average CPU of each group near this value."
  type        = number
  default     = 60
}

variable "certificate_arn" {
  description = "ACM certificate for HTTPS on the load balancer (needs a domain). Empty = HTTP only, as today."
  type        = string
  default     = ""
}

variable "nat_instance_type" {
  description = "Size of the fck-nat instance that gives the private servers outbound internet (ADR 0026)."
  type        = string
  default     = "t4g.nano"
}

variable "ghcr_pull_token" {
  description = "GitHub token with read:packages only. New servers started by Auto Scaling use it to pull the app images; stored encrypted in SSM."
  type        = string
  sensitive   = true
}

variable "ghcr_pull_user" {
  description = "GitHub user that owns ghcr_pull_token."
  type        = string
}

variable "photo_upload_origins" {
  description = "Web addresses allowed to upload photos straight to S3 from the browser (CORS). Add the HTTPS domain when there is one."
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "budget_limit_usd" {
  description = "Monthly cost budget. Alerts at 50%, 80%, 100% actual and 100% forecast."
  type        = number
  default     = 20
}

variable "budget_emails" {
  description = "Who receives budget alerts."
  type        = list(string)
}

variable "enable_rds" {
  description = "Create the production PostgreSQL database (Amazon RDS)."
  type        = bool
  default     = true
}

variable "rds_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "rds_multi_az" {
  description = "Keep a standby copy of the database in the second zone (automatic failover, about double the RDS cost)."
  type        = bool
  default     = false
}

variable "rds_restore_snapshot" {
  description = "Snapshot to create the database from. Used once, to move the existing database into the new private subnets (see README)."
  type        = string
  default     = null
}

variable "github_repo" {
  description = "Repository allowed to assume the deploy role through GitHub OIDC."
  type        = string
  default     = "ASU-MICS-2028/cc-group-1-prosit-1"
}

variable "github_repo_immutable" {
  description = "Same repository in GitHub's immutable OIDC subject form (owner@owner_id/repo@repo_id), which this repo's tokens use."
  type        = string
  default     = "ASU-MICS-2028@326597623/cc-group-1-prosit-1@1363909810"
}
