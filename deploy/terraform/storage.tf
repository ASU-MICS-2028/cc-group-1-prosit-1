# Private photo bucket per environment. Phones upload through short-lived
# presigned URLs issued by the API; nothing is public.

data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "photos" {
  for_each = var.environments
  bucket   = "agroconnect-${each.key}-photos-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "photos" {
  for_each                = var.environments
  bucket                  = aws_s3_bucket.photos[each.key].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  for_each = var.environments
  bucket   = aws_s3_bucket.photos[each.key].id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "photos" {
  for_each = var.environments
  bucket   = aws_s3_bucket.photos[each.key].id
  versioning_configuration {
    status = each.key == "production" ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  for_each = var.environments
  bucket   = aws_s3_bucket.photos[each.key].id
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Browsers upload straight to S3 with presigned PUT URLs.
# TODO: replace "*" with the app's HTTPS origin once the domain exists.
resource "aws_s3_bucket_cors_configuration" "photos" {
  for_each = var.environments
  bucket   = aws_s3_bucket.photos[each.key].id
  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = var.photo_upload_origins # only the app's own addresses (ADR 0026)
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

# HTTPS only (ADR 0026). Phones upload with presigned URLs straight from the internet,
# so the bucket cannot be limited to the VPC endpoint; access stays limited by IAM
# (only the app role can sign URLs) and the public-access block above.
data "aws_iam_policy_document" "photos_tls_only" {
  for_each = var.environments
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.photos[each.key].arn,
      "${aws_s3_bucket.photos[each.key].arn}/*",
    ]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "photos" {
  for_each = var.environments
  bucket   = aws_s3_bucket.photos[each.key].id
  policy   = data.aws_iam_policy_document.photos_tls_only[each.key].json

  depends_on = [aws_s3_bucket_public_access_block.photos]
}
