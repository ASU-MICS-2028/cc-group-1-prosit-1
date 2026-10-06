# Private image registry in the same region (ADR 0026). The deploy workflow copies each
# image from GHCR to here; servers pull with their IAM role, so no GitHub token is stored
# on any server, and pulls stay inside AWS (through fck-nat).

resource "aws_ecr_repository" "app" {
  for_each = toset(["backend", "frontend"])

  name                 = "agroconnect/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }
}

# Keep the last 30 images per repository (rollback room) and drop older ones.
resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 30 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 30
      }
      action = { type = "expire" }
    }]
  })
}

locals {
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}
