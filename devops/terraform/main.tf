terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source = "./modules/vpc"

  cluster_name = var.cluster_name
  vpc_cidr     = var.vpc_cidr
  azs          = var.azs
}

module "eks" {
  source = "./modules/eks"

  cluster_name    = var.cluster_name
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  instance_types  = var.instance_types
}

module "ecr" {
  source = "./modules/ecr"

  services       = var.services
}

module "rds" {
  source = "./modules/rds"

  databases       = var.databases
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  cluster_name    = var.cluster_name
}

module "msk" {
  source = "./modules/msk"

  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

provider "helm" {
  kubernetes {
    host                   = module.eks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
    token                  = data.aws_eks_cluster_auth.cluster.token
  }
}

provider "kubectl" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
  load_config_file       = false
}

resource "helm_release" "argocd" {
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  version          = "5.46.7"

  values = [
    <<-EOT
    server:
      service:
        type: LoadBalancer
    global:
      nodeSelector:
        workload_type: stateful
    EOT
  ]

  depends_on = [module.eks]
}

resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  namespace        = "external-secrets"
  create_namespace = true
  version          = "0.9.8"

  values = [
    <<-EOT
    installCRDs: true
    serviceAccount:
      name: external-secrets
      annotations:
        eks.amazonaws.com/role-arn: ${module.eks.external_secrets_sa_role_arn}
    webhook:
      serviceAccount:
        name: external-secrets-webhook
        annotations:
          eks.amazonaws.com/role-arn: ${module.eks.external_secrets_sa_role_arn}
    certController:
      serviceAccount:
        name: external-secrets-cert-controller
        annotations:
          eks.amazonaws.com/role-arn: ${module.eks.external_secrets_sa_role_arn}
    EOT
  ]

  depends_on = [module.eks]
}

# Wait for External Secrets Operator to be ready
resource "null_resource" "wait_for_eso" {
  depends_on = [helm_release.external_secrets]

  provisioner "local-exec" {
    command = <<-EOT
      echo "⏳ Waiting for External Secrets Operator to be ready..."
      kubectl wait --for=condition=available --timeout=300s deployment/external-secrets -n external-secrets || exit 1
      kubectl wait --for=condition=available --timeout=300s deployment/external-secrets-webhook -n external-secrets || exit 1
      echo "✅ External Secrets Operator is ready"
    EOT
  }
}
