variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "key_name" {
  description = "Name of the SSH key pair"
  type        = string
  default     = "jenkins-key"
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "ecommerce-eks"
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "Availability Zones"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b", "ap-southeast-1c"]
}

variable "instance_types" {
  description = "EKS worker node instance types"
  type        = list(string)
  default     = ["t3.small"]
}

variable "services" {
  description = "List of microservices"
  type        = list(string)
  default = [
    "auth-service",
    "product-service",
    "order-service",
    "cart-service",
    "inventory-service",
    "delivery-service",
    "rating-service",
    "payment-service",
    "frontend"
  ]
}

variable "databases" {
  description = "List of databases"
  type        = list(string)
  default     = [
    "auth-db",
    "cart-db",
    "delivery-db",
    "inventory-db",
    "order-db",
    "payment-db",
    "product-db",
    "rating-db"
  ]
}

variable "infrastructure" {
  description = "List of infrastructure"
  type        = list(string)
  default     = ["kafka", "kafka-connect"]
}
