# HTTPS without a domain (ADR 0026 amendment, 2026-10-08): one CloudFront distribution per
# environment in front of the load balancer. Each gets https://<id>.cloudfront.net with AWS's own
# certificate, so the app runs in a secure context (service worker, install, GPS, camera need it).
#
#   browser --HTTPS--> CloudFront --HTTP--> load balancer (production :80, staging :8080) --> servers
#
# Caching: nginx already sends the right Cache-Control (hashed /assets/ for a year, index.html and
# sw.js no-cache), so CloudFront follows it. /api/* is never cached and gets every viewer header,
# Authorization included. When the team has a domain, move to an ACM certificate on the load
# balancer (certificate_arn) or add it to these distributions as an alias.

locals {
  # AWS managed policies (same IDs in every account)
  cache_disabled              = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  cache_use_origin_headers    = "83da9c7e-98b4-4e11-a168-04f0df8e2c65" # Managed-UseOriginCacheControlHeaders
  origin_all_viewer_no_host   = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
  cloudfront_environments     = { for k, e in var.environments : k => e if var.enable_cloudfront }
  load_balancer_port_for_envs = { production = 80, staging = 8080 }
}

resource "aws_cloudfront_distribution" "app" {
  for_each = local.cloudfront_environments

  enabled         = true
  comment         = "AgroConnect ${each.key}: HTTPS in front of the load balancer"
  is_ipv6_enabled = true
  http_version    = "http2and3"
  # PriceClass_200 includes the edge locations in Africa (Johannesburg, Cape Town, Lagos, Nairobi).
  price_class = "PriceClass_200"

  origin {
    origin_id   = "alb"
    domain_name = aws_lb.main.dns_name

    custom_origin_config {
      http_port              = lookup(local.load_balancer_port_for_envs, each.key, 80)
      https_port             = 443
      origin_protocol_policy = "http-only" # the load balancer has no certificate yet
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
    }
  }

  # The app: pages, scripts, pictures. Cached exactly as nginx's Cache-Control says.
  default_cache_behavior {
    target_origin_id         = "alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_use_origin_headers
    origin_request_policy_id = local.origin_all_viewer_no_host
  }

  # The API: never cached; every method; all headers, cookies and query strings go through.
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "alb"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = local.cache_disabled
    origin_request_policy_id = local.origin_all_viewer_no_host
  }

  # The load balancer's health check path, handy to test the whole chain.
  ordered_cache_behavior {
    path_pattern             = "/health"
    target_origin_id         = "alb"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = local.cache_disabled
    origin_request_policy_id = local.origin_all_viewer_no_host
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { Environment = each.key }
}
