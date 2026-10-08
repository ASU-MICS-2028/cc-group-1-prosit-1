output "app_url" {
  description = "Where the app answers. Production on port 80 (443 with a certificate); staging on port 8080 until it has a host name."
  value = {
    production = "http://${aws_lb.main.dns_name}"
    staging    = "http://${aws_lb.main.dns_name}:8080"
  }
}

output "https_url" {
  description = "HTTPS addresses through CloudFront (cloudfront.tf). Use these; the plain HTTP ones above still work."
  value       = { for k, d in aws_cloudfront_distribution.app : k => "https://${d.domain_name}" }
}

output "load_balancer_dns" {
  description = "Point the domain's DNS (CNAME or Route 53 alias) here once there is one."
  value       = aws_lb.main.dns_name
}

output "autoscaling_groups" {
  value = { for k, g in aws_autoscaling_group.app : k => g.name }
}

output "shell_access" {
  description = "Servers have no public IP and no SSH. List them, then open a shell with Session Manager."
  value = {
    for k in keys(var.environments) : k => join(" ", [
      "aws ec2 describe-instances --region ${var.region}",
      "--filters Name=tag:Name,Values=agroconnect-${k} Name=instance-state-name,Values=running",
      "--query 'Reservations[].Instances[].InstanceId' --output text",
      "# then: aws ssm start-session --region ${var.region} --target <instance-id>",
    ])
  }
}

output "photo_buckets" {
  value = { for k, b in aws_s3_bucket.photos : k => b.bucket }
}

output "rds_endpoint" {
  value = var.enable_rds ? aws_db_instance.main[0].address : null
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
  description = "Each server's .env, read at boot and on every deploy. Read with: aws ssm get-parameter --with-decryption --name <this>"
  value       = { for k, p in aws_ssm_parameter.dotenv : k => p.name }
}

output "nat_instance" {
  description = "fck-nat: outbound internet for the private servers."
  value       = "fck-nat on ${var.nat_instance_type}, high-availability mode"
}
