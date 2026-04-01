
resource "aws_msk_cluster" "default" {
  cluster_name           = "ecommerce-msk"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type  = "kafka.t3.small"
    client_subnets = var.private_subnets
    storage_info {
      ebs_storage_info {
        volume_size = 10
      }
    }
    security_groups = [aws_security_group.msk.id]
  }

  tags = {
    Name = "ecommerce-msk"
  }
}

resource "aws_security_group" "msk" {
  name        = "msk-sg"
  description = "Allow inbound traffic to MSK"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnets" {
  description = "List of private subnets"
  type        = list(string)
}

  output "bootstrap_brokers" {
  description = "Plaintext connection host:port pairs"
  value       = aws_msk_cluster.default.bootstrap_brokers
}

output "bootstrap_brokers_tls" {
  description = "TLS connection host:port pairs"
  value       = aws_msk_cluster.default.bootstrap_brokers_tls
}
