# Alarms (ADR 0026): an email when an environment loses healthy servers or starts
# failing requests. Auto Scaling already replaces unhealthy servers; these tell a person.
# Each address in budget_emails gets one "confirm subscription" email from AWS first.

resource "aws_sns_topic" "alerts" {
  name = "agroconnect-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  for_each  = toset(var.budget_emails)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# A server has failed the /health check for 3 minutes in a row.
resource "aws_cloudwatch_metric_alarm" "unhealthy_servers" {
  for_each = { for k, e in var.environments : k => e if e.running }

  alarm_name          = "agroconnect-${each.key}-unhealthy-servers"
  alarm_description   = "A ${each.key} server is failing its health check. Auto Scaling should replace it; check the deploy and the server log (/var/log/agroconnect-boot.log)."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 3
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app[each.key].arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# No healthy server at all: the environment is down.
resource "aws_cloudwatch_metric_alarm" "no_healthy_servers" {
  for_each = { for k, e in var.environments : k => e if e.running }

  alarm_name          = "agroconnect-${each.key}-down"
  alarm_description   = "${title(each.key)} has no healthy server behind the load balancer: the app is down."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app[each.key].arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# The app is answering with server errors (5xx) more than occasionally.
resource "aws_cloudwatch_metric_alarm" "server_errors" {
  for_each = { for k, e in var.environments : k => e if e.running }

  alarm_name          = "agroconnect-${each.key}-server-errors"
  alarm_description   = "${title(each.key)} returned more than 20 server errors in 5 minutes."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 20
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.app[each.key].arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}
