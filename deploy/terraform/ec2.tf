# One VM per environment (staging, production): Ubuntu 24.04, Docker + Compose,
# configured on first boot by ../ec2-bootstrap.sh.

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  for_each = var.environments

  ami                    = data.aws_ami.ubuntu.id
  instance_type          = each.value.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.app[each.key].name

  # Runs the existing bootstrap script once, with this environment's deploy key.
  user_data                   = <<-EOT
    #!/bin/bash
    cat > /root/ec2-bootstrap.sh <<'SCRIPT'
    ${file("${path.module}/../ec2-bootstrap.sh")}
    SCRIPT
    bash /root/ec2-bootstrap.sh "${var.deploy_public_keys[each.key]}"
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  EOT
  user_data_replace_on_change = false

  root_block_device {
    volume_type = "gp3"
    volume_size = 8
    encrypted   = true
  }

  metadata_options {
    http_tokens = "required" # IMDSv2 only
  }

  tags = {
    Name        = "agroconnect-${each.key}"
    Environment = each.key
  }

  lifecycle {
    ignore_changes = [ami] # don't replace servers when Canonical publishes a new image
  }
}

# Fixed public IP per environment, so DNS and the GitHub secrets don't change
# when an instance is stopped and started again.
resource "aws_eip" "app" {
  for_each = var.environments
  instance = aws_instance.app[each.key].id
  domain   = "vpc"
  tags     = { Name = "agroconnect-${each.key}" }
}

# Start/stop without destroying: set environments.<env>.running in tfvars.
resource "aws_ec2_instance_state" "app" {
  for_each    = var.environments
  instance_id = aws_instance.app[each.key].id
  state       = each.value.running ? "running" : "stopped"
}
