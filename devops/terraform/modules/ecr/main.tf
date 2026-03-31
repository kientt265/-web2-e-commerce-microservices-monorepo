locals {
  all_repos = concat(var.services, var.databases, var.infrastructure)
}

resource "aws_ecr_repository" "repos" {
  for_each = toset(local.all_repos)
  name     = each.key

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = "production"
    Project     = "ecommerce"
  }
}

variable "services" {
  type = list(string)
}

variable "databases" {
  type = list(string)
}

variable "infrastructure" {
  type = list(string)
}

output "repository_urls" {
  value = { for k, v in aws_ecr_repository.repos : k => v.repository_url }
}
