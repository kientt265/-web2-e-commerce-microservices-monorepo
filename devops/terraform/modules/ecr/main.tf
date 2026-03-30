resource "aws_ecr_repository" "services" {
  for_each = toset(var.services)
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

output "repository_urls" {
  value = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}
