# SDLC Preparation and Template Search

Requested root SDLC.md as Tank; user additionally requires using the template. Read Tank instructions/state, recent chat, PROJECT.md, Makefile, README and .gitignore. Project working tree was clean before task entry messages.

No SDLC template found through VIA, project templates, followed shared Codex skills, canonical local BobProtocol repository (including bobp/templates), or inspected installed-library template locations. Existing project templates are ARCH, CHAT, LESSON, finding, state and tldr. Do not substitute ARCH or invent a template and claim it is the requested one. SDLC drafting and README link await the user's template location.

Verified current automation: setup/install, extract-assets, dev, build, test, test-q with ARGS, lint/typecheck, via-index, visual-review setup/capture/interactions. bobp make captures one shared build/build.out, so run targets serially. test includes ESLint, TypeScript and Vitest; visual-review requires ARGS=--interactions for actual interaction checks. judge-trace uses ||true and underlying jinja2 dependency is known missing.

No tracked GitHub Actions workflow, .githooks or deployment config found; only .github/copilot-instructions.md exists. core.hooksPath unset. Do not claim CI, secret scan or hooks are installed. .gitignore excludes node_modules/build/dist/raw original archives and extracted assets, but has no explicit .env rule. No implementation of missing tooling authorized by this documentation task.

Expected SDLC content once template available: persona planning/review gates; bounded tests; final accepted-story evidence audit; live UX checks; portable timestamp filenames; staged-path review including no newly introduced colons, secrets or raw assets; explicitly requested commit/push to established origin/main; no force push or implied deployment. Current remote push17cadcc already completed before this task; do not commit/push new doc without instruction.

No product tests run for documentation-only preparation. Parent notified missing template.
