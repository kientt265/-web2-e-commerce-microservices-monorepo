
resource "random_password" "password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "rds_password" {
  name = "rds-password"
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  secret_id = aws_secretsmanager_secret.rds_password.id
  secret_string = jsonencode({
    password = random_password.password.result
    endpoint = aws_db_instance.default.address
  })
}

# Create DB parameter group với SSL enabled
resource "aws_db_parameter_group" "default" {
  name   = "ecommerce-pg-params"
  family = "postgres15"

  parameter {
    name  = "ssl"
    value = "on"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "0"  # Không force SSL để cho phép cả 2 loại kết nối
  }
}

# Request SSL certificate cho RDS
resource "aws_acm_certificate" "rds" {
  domain_name       = "${var.cluster_name}-rds.local"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.cluster_name}-rds.local"
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "default" {
  identifier             = "ecommerce-rds"
  engine                 = "postgres"
  engine_version         = "15"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp2"
  username               = "postgres"
  password               = random_password.password.result
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.default.name
  parameter_group_name   = aws_db_parameter_group.default.name
  skip_final_snapshot    = true
  
  # SSL configuration
  ca_cert_identifier = "rds-ca-rsa2048-g1"
  
  tags = {
    Name = "ecommerce-rds"
    SSL  = "enabled"
  }
}

resource "aws_db_subnet_group" "default" {
  name       = "main"
  subnet_ids = var.private_subnets
}

resource "aws_security_group" "rds" {
  name        = "rds-sg"
  description = "Allow inbound traffic to RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

variable "databases" {
  description = "List of databases"
  type        = list(string)
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnets"
  type        = list(string)
}

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

output "rds_endpoint" {
  value = aws_db_instance.default.endpoint
}

output "rds_address" {
  value = aws_db_instance.default.address
}
