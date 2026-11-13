.PHONY: help deps browser-deps data-deps check-deps gates setup install extract-assets dev build test test-q test-serial lint typecheck tldr via-index judge-trace clean visual-review visual-review-setup sprint3-visual-review sprint4-visual-review sprint5-visual-review sprint6-visual-review sprint7-visual-review sprint8-visual-review extract-dm2 dm2-sheet dm1-sheet export-sprites export-sprites-review

DATE ?= $(shell date +%F)

# ---- Runtime dependencies for testing (single source of truth) -------------------------------
# Every package (including @playwright/test and vite-node) is declared in package.json; only the
# Chromium browser binary and local Amiga data live outside npm.
PLAYWRIGHT := npm exec --
STAMPS := build/.stamps
NPM_STAMP := $(STAMPS)/npm
BROWSER_STAMP := $(STAMPS)/chromium
DM1_ZIP := Dungeon-Master_Amiga_EN.zip
DM2_ZIP := Dungeon-Master-II-Skullkeep_Amiga_EN.zip
DM1_DATA := public/assets/extracted/dm1/graphics.dat
DM2_DATA := public/assets/extracted/dm2/GRAPHICS.DAT

help: ## List all available project targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

setup: ## Install npm dependencies, extract local Amiga assets if present, and index via
	npm install --no-audit --no-fund
	python3 scripts/extract_assets.py
	via index .

install: setup ## Alias for setup

extract-assets: ## Extract original DM1 & DM2 assets from local Amiga zip archives if present
	python3 scripts/extract_assets.py

$(NPM_STAMP): package.json package-lock.json
	npm install --no-audit --no-fund
	@mkdir -p $(STAMPS) && touch $@

deps: $(NPM_STAMP) ## Install npm packages (only when package.json/lock changed)

$(BROWSER_STAMP): $(NPM_STAMP) package-lock.json
	$(PLAYWRIGHT) playwright install chromium
	@mkdir -p $(STAMPS) && touch $@

browser-deps: $(BROWSER_STAMP) ## Install the Chromium matching package.json's @playwright/test needed by the *-visual-review gates

data-deps: ## Extract local Amiga data when the zips are present (tests skip real-data cases without it)
	@if [ ! -f $(DM1_DATA) ] && [ -f $(DM1_ZIP) ]; then python3 scripts/extract_assets.py; fi
	@if [ ! -f $(DM2_DATA) ] && [ -f public/assets/extracted/dm2/DM2_archive.LZX ]; then $(MAKE) --no-print-directory extract-dm2; fi
	@for f in $(DM1_DATA) $(DM2_DATA); do [ -f $$f ] || echo "NOTE: $$f missing - real-data tests will skip"; done

check-deps: ## Report every runtime dependency tests rely on, without installing anything
	@printf 'node        : '; node --version
	@printf 'python3     : '; python3 --version 2>&1 || echo "MISSING (lzx tests skip)"
	@printf 'npm packages: '; [ -f $(NPM_STAMP) ] && echo "installed" || echo "run: make deps"
	@printf 'playwright  : '; node -p "'@playwright/test ' + require('./package.json').devDependencies['@playwright/test']" | tr -d '\n'; printf ', chromium '; [ -f $(BROWSER_STAMP) ] && echo "installed" || echo "run: make browser-deps"
	@printf 'DM1 data    : '; [ -f $(DM1_DATA) ] && echo present || echo "missing (real-data tests skip)"
	@printf 'DM2 data    : '; [ -f $(DM2_DATA) ] && echo present || echo "missing (DM2 tests skip)"

gates: lint test-serial build sprint3-visual-review sprint4-visual-review sprint5-visual-review sprint6-visual-review sprint7-visual-review sprint8-visual-review ## Full sprint gate: lint, serial tests, build, all browser gates

dev: ## Start Vite development server
	npx vite --host 127.0.0.1 --port 5173

build: deps ## Typecheck and build production bundle into dist/
	npx tsc --noEmit
	npx vite build

test: deps data-deps ## Run full test suite (lint + typecheck + verbose Vitest)
	npx eslint src tests
	npx tsc --noEmit
	npx vitest run --reporter=verbose

test-q: deps data-deps ## Run fast quiet Vitest suite for TDD iteration
	npx vitest run --reporter=dot $(ARGS)

test-serial: deps data-deps ## Run Vitest with one worker and no file parallelism for resource-bounded verification
	npx vitest run --reporter=dot --no-file-parallelism --minWorkers=1 --maxWorkers=1 $(ARGS)

lint: deps ## Run ESLint and TypeScript strict compiler checks
	npx eslint src tests
	npx tsc --noEmit

typecheck: deps ## Run TypeScript compiler check without emitting files
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

visual-review: browser-deps data-deps ## Capture live Chromium sprint scenes and original inventory panels (temporary Playwright runner)
	$(PLAYWRIGHT) node scripts/sprint2-visual-review.mjs $(ARGS)

visual-review-setup: browser-deps ## Alias for browser-deps (Chromium for the live visual review runner)

sprint3-visual-review: browser-deps data-deps ## Run bounded Sprint 3 panel/input browser smoke for Trin/Smith evidence preparation
	$(PLAYWRIGHT) node scripts/sprint3-visual-review.mjs $(ARGS)

sprint4-visual-review: browser-deps data-deps ## Run bounded Sprint 4 monster browser gate (visible, approach, injury, kill)
	$(PLAYWRIGHT) node scripts/sprint4-visual-review.mjs $(ARGS)

sprint5-visual-review: browser-deps data-deps ## Run bounded Sprint 5 browser gate (save/load, import, victory)
	$(PLAYWRIGHT) node scripts/sprint5-visual-review.mjs $(ARGS)

sprint6-visual-review: browser-deps data-deps ## Run bounded Sprint 6 browser gate (roster export/import/recruit)
	$(PLAYWRIGHT) node scripts/sprint6-visual-review.mjs $(ARGS)

extract-dm2: ## Extract DM2_archive.LZX with full CRC verification into public/assets/extracted/dm2/
	python3 scripts/lzx_extract.py public/assets/extracted/dm2/DM2_archive.LZX public/assets/extracted/dm2

dm2-sheet: ## Write grayscale PNG contact sheets of decodable DM2 GRAPHICS.DAT images to build/dm2-sheets/
	npx vite-node scripts/dm2-sheet.ts $(ARGS)

dm1-sheet: ## Write index-labelled DM1 sprite contact sheets: bobp make dm1-sheet ARGS="FROM TO"
	npx vite-node scripts/dm1-sheet.ts $(ARGS)

sprint7-visual-review: browser-deps data-deps ## Run bounded Sprint 7 browser check (import real DM2 Dungeon.dat as an unrecognized campaign)
	$(PLAYWRIGHT) node scripts/sprint7-visual-review.mjs $(ARGS)

sprint8-visual-review: browser-deps data-deps ## Run bounded Sprint 8 browser check (import real DM2 GRAPHICS.DAT honestly)
	$(PLAYWRIGHT) node scripts/sprint8-visual-review.mjs $(ARGS)

SPRITE_INPUT ?= public/assets/extracted/dm1/graphics.dat
SPRITE_OUTPUT ?= build/sprites

export-sprites: ## Export local original sprites as indexed PNGs plus deterministic manifest
	node scripts/export-sprites.mjs --input "$(SPRITE_INPUT)" --output "$(SPRITE_OUTPUT)" $(ARGS)

export-sprites-review: browser-deps data-deps ## Independently decode exported PNGs in pinned Chromium and capture review art
	$(PLAYWRIGHT) node scripts/review-sprite-export.mjs --input "$(SPRITE_INPUT)" --output "$(SPRITE_OUTPUT)" $(ARGS)
