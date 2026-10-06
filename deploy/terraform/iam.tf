# Role for the EC2 instances: Session Manager access (no SSH needed),
# read/write to their own photo bucket and read their own config in SSM
# Parameter Store. No AWS keys are stored on servers.

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  for_each           = var.environments
  name               = "agroconnect-${each.key}-app"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  for_each   = var.environments
  role       = aws_iam_role.app[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "photos" {
  for_each = var.environments
  statement {
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.photos[each.key].arn}/*"]
  }
  statement {
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.photos[each.key].arn]
  }
}

resource "aws_iam_role_policy" "photos" {
  for_each = var.environments
  name     = "photos-bucket"
  role     = aws_iam_role.app[each.key].id
  policy   = data.aws_iam_policy_document.photos[each.key].json
}

data "aws_iam_policy_document" "config" {
  for_each = var.environments
  statement {
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/agroconnect/${each.key}/*"]
  }
}

resource "aws_iam_role_policy" "config" {
  for_each = var.environments
  name     = "read-own-config"
  role     = aws_iam_role.app[each.key].id
  policy   = data.aws_iam_policy_document.config[each.key].json
}

# Pull the app images from ECR (ecr.tf) with the server's own role; no registry token.
data "aws_iam_policy_document" "ecr_pull" {
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    actions   = ["ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer", "ecr:BatchCheckLayerAvailability"]
    resources = [for r in aws_ecr_repository.app : r.arn]
  }
}

resource "aws_iam_role_policy" "ecr_pull" {
  for_each = var.environments
  name     = "pull-app-images"
  role     = aws_iam_role.app[each.key].id
  policy   = data.aws_iam_policy_document.ecr_pull.json
}

resource "aws_iam_instance_profile" "app" {
  for_each = var.environments
  name     = "agroconnect-${each.key}-app"
  role     = aws_iam_role.app[each.key].name
}

# GitHub Actions → AWS without stored keys (OIDC). The deploy workflow can
# assume this role and run commands on the instances through Session Manager,
# so port 22 never has to be open to GitHub's changing IPs.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# One deploy role per environment: a staging job can only reach the staging server.
data "aws_iam_policy_document" "github_assume" {
  for_each = var.environments
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Only deploy jobs running in this GitHub environment. GitHub sends the
    # immutable (ID-based) subject for this repo; the name form is kept too.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values = [
        "repo:${var.github_repo_immutable}:environment:${each.key}",
        "repo:${var.github_repo}:environment:${each.key}",
      ]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  for_each           = var.environments
  name               = "agroconnect-github-deploy-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.github_assume[each.key].json
}

data "aws_iam_policy_document" "github_deploy" {
  for_each = var.environments
  statement {
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${var.region}::document/AWS-RunShellScript"]
  }
  # Servers come and go with Auto Scaling, so the role may run commands on any
  # instance tagged with its own environment, and nothing else.
  statement {
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${var.region}:${data.aws_caller_identity.current.account_id}:instance/*"]
    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Environment"
      values   = [each.key]
    }
  }
  # Record the deployed tag, so servers Auto Scaling starts later run the same version.
  statement {
    actions   = ["ssm:PutParameter"]
    resources = [aws_ssm_parameter.image_tag[each.key].arn]
  }
  statement {
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations", "ec2:DescribeInstances"]
    resources = ["*"]
  }
  # Copy the built images from GHCR into ECR before rolling out.
  statement {
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload", "ecr:PutImage",
    ]
    resources = [for r in aws_ecr_repository.app : r.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  for_each = var.environments
  name     = "deploy-via-ssm"
  role     = aws_iam_role.github_deploy[each.key].id
  policy   = data.aws_iam_policy_document.github_deploy[each.key].json
}
