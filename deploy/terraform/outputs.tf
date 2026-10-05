output "public_ips" {
  description = "Fixed public IP per environment (the app is served on http://<ip>)."
  value       = { for k, e in aws_eip.app : k => e.public_ip }
}

output "instance_ids" {
  value = { for k, i in aws_instance.app : k => i.id }
}

output "shell_access" {
  description = "Open a shell without SSH (works from any IP)."
  value       = { for k, i in aws_instance.app : k => "aws ssm start-session --target ${i.id} --region ${var.region}" }
}

output "photo_buckets" {
  value = { for k, b in aws_s3_bucket.photos : k => b.bucket }
}

output "rds_endpoint" {
  value = var.enable_rds ? aws_db_instance.production[0].address : null
}

output "rds_password_parameter" {
  description = "Read with: aws ssm get-parameter --name <this> --with-decryption"
  value       = var.enable_rds ? aws_ssm_parameter.db_password[0].name : null
}

output "github_deploy_role_arns" {
  description = "Roles the deploy workflow assumes (per GitHub environment) to roll out through Session Manager."
  value       = { for k, r in aws_iam_role.github_deploy : k => r.arn }
}

output "app_config_parameters" {
  description = "Each server's .env, written on every deploy. Read with: aws ssm get-parameter --with-decryption --name <this>"
  value       = { for k, p in aws_ssm_parameter.dotenv : k => p.name }
}

output "ssh_open_to" {
  value = length(var.ssh_allowed_cidrs) == 0 ? "nobody (use shell_access)" : join(", ", var.ssh_allowed_cidrs)
}
