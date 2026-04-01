#!/bin/bash

# Test script cho automation
# Usage: ./test-automation.sh

echo "🧪 Testing DevOps Automation..."

# Test 1: Check if all automation files exist
echo "📁 Checking automation files..."
files=(
    "k8s/helm-values/external-secrets-values.yaml"
    "ansible/roles/external-secrets-fix/tasks/main.yml"
    "Makefile"
    "terraform/external-secrets.tf"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Test 2: Check Terraform syntax
echo "🔍 Checking Terraform syntax..."
cd terraform
if terraform validate; then
    echo "✅ Terraform syntax valid"
else
    echo "❌ Terraform syntax error"
fi

# Test 3: Check if Terraform external-secrets configuration exists
echo "� Checking Terraform external-secrets configuration..."
if [ -f "terraform/external-secrets.tf" ]; then
    echo "✅ Terraform external-secrets configuration exists"
else
    echo "❌ Terraform external-secrets configuration missing"
fi

# Test 4: Show available commands
echo "📋 Available automation commands:"
echo "  make help              - Show all commands"
echo "  make terraform-apply   - Deploy infrastructure"
echo "  make check-status      - Check ArgoCD status"
echo "  make full-deploy       - Full deployment pipeline (auto-fix included)"
echo "  make check-eso         - Check External Secrets status"
echo "  make check-secrets     - Check if secrets are created"

echo "🎉 Automation test completed!"