terraform {
  required_version = ">= 1.10"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 6.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }

  # State lives in the bucket created by ./bootstrap. use_lockfile gives
  # S3-native locking, so two people can't apply at the same time.
  backend "s3" {
    bucket       = "agroconnect-tfstate-659500703236"
    key          = "main/terraform.tfstate"
    region       = "af-south-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "agroconnect"
      ManagedBy = "terraform"
    }
  }
}
