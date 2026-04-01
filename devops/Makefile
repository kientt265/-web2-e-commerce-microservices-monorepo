# Makefile cho DevOps automation
.PHONY: help terraform-apply terraform-destroy fix-eso-irsa check-status

# Colors
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

help: ## Show this help message
	@echo '${GREEN}DevOps Automation Commands:${RESET}'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${YELLOW}%-20s${RESET} %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''

terraform-init: ## Initialize Terraform
	@echo "${GREEN}Initializing Terraform...${RESET}"
	cd terraform && terraform init

terraform-plan: ## Plan Terraform changes
	@echo "${GREEN}Planning Terraform changes...${RESET}"
	cd terraform && terraform plan

terraform-apply: ## Apply Terraform changes
	@echo "${GREEN}Applying Terraform changes...${RESET}"
	cd terraform && terraform apply -auto-approve

terraform-destroy: ## Destroy Terraform infrastructure
	@echo "${GREEN}Destroying Terraform infrastructure...${RESET}"
	cd terraform && terraform destroy -auto-approve

fix-eso-irsa: ## Fix External Secrets Operator IRSA (manual method)
	@echo "${GREEN}Fixing ESO IRSA configuration...${RESET}"
	./scripts/fix-eso-irsa.sh

fix-eso-irsa-ansible: ## Fix ESO IRSA using Ansible
	@echo "${GREEN}Fixing ESO IRSA with Ansible...${RESET}"
	cd ansible && ansible-playbook -i inventory.ini playbook.yml --tags external-secrets-fix

check-status: ## Check ArgoCD application status
	@echo "${GREEN}Checking ArgoCD application status...${RESET}"
	kubectl get application ecommerce-app -n argocd

check-eso: ## Check External Secrets Operator status
	@echo "${GREEN}Checking ESO status...${RESET}"
	kubectl get pods -n external-secrets
	kubectl get externalsecrets -A

check-secrets: ## Check if secrets are created
	@echo "${GREEN}Checking Kubernetes secrets...${RESET}"
	kubectl get secrets -n default | grep -E "(auth|cart|order|inventory|payment|product|delivery|rating)"

full-deploy: terraform-init terraform-apply check-status ## Full deployment pipeline (no manual fixes needed)
	@echo "${GREEN}Deployment completed!${RESET}"
	@echo "${YELLOW}Note: External Secrets Operator is automatically configured with IRSA${RESET}"
	@echo "${YELLOW}and URL encoding is handled in Terraform templates${RESET}"

clean: terraform-destroy ## Clean up everything
	@echo "${GREEN}Cleanup completed!${RESET}"

# Development commands
dev-fix-eso: ## Quick ESO fix for development
	@echo "${GREEN}Quick ESO fix...${RESET}"
	@read -p "Enter AWS Account ID: " account_id; \
	./scripts/fix-eso-irsa.sh $$account_id