.PHONY: help dev build up down logs shell lint test typecheck

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# --- Local ---

install: ## Install dependencies
	pnpm install

dev: ## Start local dev server (no Docker)
	pnpm dev

lint: ## Run ESLint
	pnpm lint

typecheck: ## Run TypeScript type check
	pnpm typecheck

test: ## Run unit tests
	pnpm test

test-coverage: ## Run tests with coverage
	pnpm test:coverage

build-local: ## Build for production locally
	pnpm build

# --- Docker ---

build: ## Build production Docker image
	docker compose build app

up: ## Start production container (port 8080)
	docker compose up app

up-dev: ## Start dev container with hot-reload (port 3000)
	docker compose up dev

down: ## Stop all containers
	docker compose down

logs: ## Follow container logs
	docker compose logs -f

shell: ## Open a shell in the running app container
	docker compose exec app sh

rebuild: down build up ## Full rebuild and restart
