# App servers (ADR 0026): one Auto Scaling group per environment, in the private app
# subnets of both zones, behind the load balancer.
#
#   production  2 to 4 servers, one per zone at minimum; adds servers when CPU stays high
#   staging     exactly 1; does not scale, but a dead server is replaced automatically
#   running = false in var.environments scales a group to 0 (nothing is destroyed)
#
# A new server sets itself up with ../server-boot.sh.tftpl and starts the last deployed
# image. Deploys still go through SSM (deploy.yml), now to every server in the group.

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

locals {
  image_prefix = "ghcr.io/${lower(var.github_repo)}"
}

resource "aws_launch_template" "app" {
  for_each = var.environments

  name          = "agroconnect-${each.key}"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = each.value.instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.app[each.key].name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [aws_security_group.app.id]
  }

  user_data = base64encode(templatefile("${path.module}/../server-boot.sh.tftpl", {
    environment  = each.key
    region       = var.region
    image_prefix = local.image_prefix
    compose_b64  = filebase64("${path.module}/../docker-compose.yml")
  }))

  block_device_mappings {
    device_name = "/dev/sda1"
    ebs {
      volume_type           = "gp3"
      volume_size           = 8
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_tokens                 = "required" # IMDSv2 only
    http_put_response_hop_limit = 2          # containers on the host can still reach IMDS
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "agroconnect-${each.key}"
      Environment = each.key
    }
  }

  lifecycle {
    ignore_changes = [image_id] # don't roll servers when Canonical publishes a new image
  }
}

resource "aws_autoscaling_group" "app" {
  for_each = var.environments

  name                = "agroconnect-${each.key}"
  vpc_zone_identifier = aws_subnet.app[*].id
  min_size            = each.value.running ? each.value.min_size : 0
  max_size            = each.value.running ? each.value.max_size : 0
  target_group_arns   = [aws_lb_target_group.app[each.key].arn]

  # Replace a server the load balancer reports unhealthy, not only one that is down.
  health_check_type         = "ELB"
  health_check_grace_period = 420 # first boot installs Docker and pulls the images

  launch_template {
    id      = aws_launch_template.app[each.key].id
    version = aws_launch_template.app[each.key].latest_version
  }

  # A changed launch template (e.g. a new instance type) replaces servers one at a time.
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 50
      instance_warmup        = 420
    }
  }

  tag {
    key                 = "Name"
    value               = "agroconnect-${each.key}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = each.key
    propagate_at_launch = true
  }

  depends_on = [module.fck_nat] # new servers need outbound internet to set themselves up
}

# Keep the average CPU near the target by adding or removing servers (within min/max).
resource "aws_autoscaling_policy" "cpu" {
  for_each = { for k, e in var.environments : k => e if e.max_size > e.min_size }

  name                   = "agroconnect-${each.key}-cpu"
  autoscaling_group_name = aws_autoscaling_group.app[each.key].name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = var.cpu_target_percent
  }
}
