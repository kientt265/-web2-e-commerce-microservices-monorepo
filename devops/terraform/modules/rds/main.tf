

resource "random_password" "password" {
  for_each = toset(var.databases)
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "rds_password" {
  for_each = toset(var.databases)
  name = "rds-password-${each.key}"
}

resource "aws_secretsmanager_secret_version" "rds_password" {
  for_each      = toset(var.databases)
  secret_id     = aws_secretsmanager_secret.rds_password[each.key].id
  secret_string = random_password.password[each.key].result
}

resource "aws_db_instance" "default" {
  for_each = toset(var.databases)

  identifier           = each.key
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  storage_type         = "gp2"
  username             = "postgres"
  password             = random_password.password[each.key].result
  db_name              = replace(each.key, "-", "_")
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name = aws_db_subnet_group.default.name
  skip_final_snapshot  = true
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

