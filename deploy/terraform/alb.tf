# One Application Load Balancer for both environments (ADR 0026), to pay for one, not two.
# It is the only way in from the internet: users, and later Africa's Talking USSD/SMS
# callbacks, reach the private app servers through it.
#
#   production  port 80 (and 443 once certificate_arn is set), or its own host name
#   staging     port 8080 until it has a host name, then by host name on 80/443
#
# Health check: GET /health through nginx to the backend, every 15 s. An unhealthy server
# gets no traffic, and Auto Scaling replaces it (asg.tf, health_check_type = "ELB").

locals {
  https = var.certificate_arn != ""
  hosts = { for k, e in var.environments : k => e.host if e.host != "" }
}

resource "aws_lb" "main" {
  name               = "agroconnect"
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  idle_timeout       = 60

  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "app" {
  for_each = var.environments

  name                 = "agroconnect-${each.key}"
  port                 = 80
  protocol             = "HTTP"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 30

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# Port 80: redirect to HTTPS when there is a certificate, otherwise serve production.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = local.https ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = local.https ? [] : [1]
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.app["production"].arn
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = local.https ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["production"].arn
  }
}

# Host-name rules (e.g. staging.example.com) on whichever listener serves the app.
resource "aws_lb_listener_rule" "host" {
  for_each     = local.hosts
  listener_arn = local.https ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
  priority     = 10 + index(keys(var.environments), each.key)

  condition {
    host_header {
      values = [each.value]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app[each.key].arn
  }
}

# Staging without a domain: port 8080 of the load balancer.
resource "aws_lb_listener" "staging" {
  count             = contains(keys(var.environments), "staging") ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 8080
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app["staging"].arn
  }
}

resource "aws_vpc_security_group_ingress_rule" "alb_staging" {
  count             = contains(keys(var.environments), "staging") ? 1 : 0
  security_group_id = aws_security_group.alb.id
  description       = "Staging until it has its own host name"
  ip_protocol       = "tcp"
  from_port         = 8080
  to_port           = 8080
  cidr_ipv4         = "0.0.0.0/0"
}
