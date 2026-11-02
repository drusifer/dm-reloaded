.PHONY: help setup install extract-assets dev build test test-q lint typecheck tldr via-index judge-trace clean

DATE ?= $(shell date +%F)

help: ## List all available project targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

setup: ## Install npm dependencies, extract local Amiga assets if present, and index via
	npm install --no-audit --no-fund
	python3 scripts/extract_assets.py
	via index .

install: setup ## Alias for setup

extract-assets: ## Extract original DM1 & DM2 assets from local Amiga zip archives if present
	python3 scripts/extract_assets.py

dev: ## Start Vite development server
	npx vite --host 127.0.0.1 --port 5173

build: ## Typecheck and build production bundle into dist/
	npx tsc --noEmit
	npx vite build

test: ## Run full test suite (lint + typecheck + verbose Vitest)
	npx eslint src tests
	npx tsc --noEmit
	npx vitest run --reporter=verbose

test-q: ## Run fast quiet Vitest suite for TDD iteration
	npx vitest run --reporter=dot $(ARGS)

lint: ## Run ESLint and TypeScript strict compiler checks
	npx eslint src tests
	npx tsc --noEmit

typecheck: ## Run TypeScript compiler check without emitting files
	npx tsc --noEmit

tldr: ## Display TLDR summaries across project files via bobp
	via index .
	bobp tldr || true

via-index: ## Refresh the via symbol and markdown index
	via index .

judge-trace: ## Run BobProtocol session trace annotation for QA gate verification
	bobp trace-annotate --date $(DATE) || true

clean: ## Remove dist/ and build/ artifacts
	rm -rf dist build/tldr_prep
