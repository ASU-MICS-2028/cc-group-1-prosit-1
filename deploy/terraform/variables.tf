variable "region" {
  description = "AWS region (ADR 0001: Cape Town, closest AWS region to Ghana)."
  type        = string
  default     = "af-south-1"
}

variable "environments" {
  description = "One EC2 instance and one photo bucket per environment."
  type = map(object({
    instance_type = string
    running       = bool # false = instance is stopped (disk kept, no compute cost)
  }))
  default = {
    staging    = { instance_type = "t3.micro", running = false }
    production = { instance_type = "t3.micro", running = false }
  }
}

variable "deploy_public_keys" {
  description = "SSH public key per environment for the 'deploy' user (GitHub Actions). Generate with: ssh-keygen -t ed25519 -f ~/.ssh/agroconnect_<env>"
  type        = map(string)
}

variable "ssh_allowed_cidrs" {
  description = "IPs allowed to reach port 22. Empty = SSH closed (use Session Manager instead). Example: [\"41.66.12.34/32\"]. Run ./allow-my-ip.sh to add your current IP."
  type        = list(string)
  default     = []
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
