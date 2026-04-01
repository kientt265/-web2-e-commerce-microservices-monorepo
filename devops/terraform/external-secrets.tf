# Create ClusterSecretStore for AWS Secrets Manager
resource "kubectl_manifest" "cluster_secret_store" {
  yaml_body = <<-YAML
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secret-store
spec:
  provider:
    aws:
      service: SecretsManager
      region: ${var.aws_region}
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
YAML

  depends_on = [null_resource.wait_for_eso]
}

# Create ExternalSecret resources với URL encoding fix
locals {
  databases = ["auth", "cart", "delivery", "inventory", "order", "payment", "product", "rating"]
  
  external_secrets_yaml = <<-YAML
%{ for db in local.databases ~}
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ${db}-db-secret
  namespace: default
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: aws-secret-store
    kind: ClusterSecretStore
  target:
    name: ${db}-db-secret
    template:
      engineVersion: v2
      data:
        # URL encode password để tránh lỗi ký tự đặc biệt
        DATABASE_URL: |
          {{- \$password := .password | urlquery -}}
          postgresql://postgres:{{ "{{ \$password }}" }}@{{ "{{ .endpoint }}" }}:5432/${db}_db
        PASSWORD: "{{ "{{ .password }}" }}"
        ENDPOINT: "{{ "{{ .endpoint }}" }}"
  data:
  - secretKey: password
    remoteRef:
      key: rds-password
      property: password
  - secretKey: endpoint
    remoteRef:
      key: rds-password
      property: endpoint
%{ endfor ~}
YAML
}

# Apply ExternalSecret manifests
resource "kubectl_manifest" "external_secrets" {
  for_each = toset(local.databases)
  
  yaml_body = templatefile("${path.module}/templates/external-secret.yaml.tpl", {
    database = each.value
    region   = var.aws_region
  })

  depends_on = [kubectl_manifest.cluster_secret_store]
}

# Create template file for ExternalSecret
resource "local_file" "external_secret_template" {
  filename = "${path.module}/templates/external-secret.yaml.tpl"
  content  = <<-EOT
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ${database}-db-secret
  namespace: default
spec:
  refreshInterval: "1h"
  secretStoreRef:
    name: aws-secret-store
    kind: ClusterSecretStore
  target:
    name: ${database}-db-secret
    template:
      engineVersion: v2
      data:
        # URL encode password để tránh lỗi ký tự đặc biệt
        # Thêm SSL config để support encryption
        DATABASE_URL: |
          {{- \$password := .password | urlquery -}}
          postgresql://postgres:{{ "{{ \$password }}" }}@{{ "{{ .endpoint }}" }}:5432/${database}_db?sslmode=require
        PASSWORD: "{{ "{{ .password }}" }}"
        ENDPOINT: "{{ "{{ .endpoint }}" }}"
        # SSL mode configuration cho service code
        SSL_MODE: "require"
  data:
  - secretKey: password
    remoteRef:
      key: rds-password
      property: password
  - secretKey: endpoint
    remoteRef:
      key: rds-password
      property: endpoint
EOT

  depends_on = [null_resource.wait_for_eso]
}