output "vpc_id" {
  value = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}

output "jenkins_public_ip" {
  value = aws_instance.jenkins.public_ip
}

output "rds_endpoint" {
  value = module.rds.rds_endpoint
}

output "msk_bootstrap_brokers" {
  value = module.msk.bootstrap_brokers
}

output "msk_bootstrap_brokers_tls" {
  value = module.msk.bootstrap_brokers_tls
}
