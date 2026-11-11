.PHONY: help setup install extract-assets dev build test test-q test-serial lint typecheck tldr via-index judge-trace clean visual-review visual-review-setup sprint3-visual-review sprint4-visual-review export-sprites export-sprites-review

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

test-serial: ## Run Vitest with one worker and no file parallelism for resource-bounded verification
	npx vitest run --reporter=dot --no-file-parallelism --minWorkers=1 --maxWorkers=1 $(ARGS)

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

visual-review: ## Capture live Chromium sprint scenes and original inventory panels (temporary Playwright runner)
	npm exec --yes --package=@playwright/test@1.64.1 -- node scripts/sprint2-visual-review.mjs $(ARGS)

visual-review-setup: ## Download temporary Chromium for the live visual review runner
	npm exec --yes --package=@playwright/test@1.64.1 -- playwright install chromium

sprint3-visual-review: ## Run bounded Sprint 3 panel/input browser smoke for Trin/Smith evidence preparation
	npm exec --yes --package=@playwright/test@1.64.1 -- node scripts/sprint3-visual-review.mjs $(ARGS)

sprint4-visual-review: ## Run bounded Sprint 4 monster browser gate (visible, approach, injury, kill)
	npm exec --yes --package=@playwright/test@1.64.1 -- node scripts/sprint4-visual-review.mjs $(ARGS)

SPRITE_INPUT ?= public/assets/extracted/dm1/graphics.dat
SPRITE_OUTPUT ?= build/sprites

export-sprites: ## Export local original sprites as indexed PNGs plus deterministic manifest
	node scripts/export-sprites.mjs --input "$(SPRITE_INPUT)" --output "$(SPRITE_OUTPUT)" $(ARGS)

export-sprites-review: ## Independently decode exported PNGs in pinned Chromium and capture review art
	npm exec --yes --package=@playwright/test@1.64.1 -- node scripts/review-sprite-export.mjs --input "$(SPRITE_INPUT)" --output "$(SPRITE_OUTPUT)" $(ARGS)
