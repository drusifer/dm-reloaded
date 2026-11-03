# Dungeon Master — SDLC

How this project is built, tested, changed and released — the source of truth for change management across the project. **Owned by Tank**; request changes through `@Tank *devops sdlc <what and why>` so the mechanism and this document stay aligned. Explicit user instructions take precedence.

Adapted from the canonical [SDLC template](../agents/templates/_template_SDLC.md) and [JavaScript / TypeScript profile](../agents/templates/_template_SDLC.javascript.md), recovered from Darius's BobProtocol repository.

## 1. Toolchain

| | JavaScript / TypeScript |
|---|---|
| Runtime version | Node **not pinned**: no runtime pin file or `engines.node` declaration. Observed locally: Node `24.18.0`; this is evidence, not a project requirement. |
| Manifest | [`package.json`](../package.json), ES modules, TypeScript/Vite/Vitest development tools |
| Lockfile | [`package-lock.json`](../package-lock.json), committed; the only project package-manager lockfile |
| Package manager | npm; no `packageManager` pin. Observed locally: npm `11.16.0`. |
| Local environment | `node_modules/`, gitignored |

Other required tools: Python 3 for local asset extraction; `bobp` for captured Makefile execution and team chat; VIA for symbol navigation/indexing; Git and Make. These tools and Node/npm must already be on `PATH`; the project does not install them. Python `3.14.8` was observed locally, but no Python version is pinned.

Browser review uses temporary `@playwright/test@1.64.1` through npm exec and downloaded Chromium. It is not a production dependency or an entry in this project's lockfile.

## 2. Setup

From a clean checkout with the prerequisites above:

```sh
bobp make setup
bobp make test
```

`install` aliases `setup`. Setup runs `npm install --no-audit --no-fund`, extracts local original game archives when available, and indexes VIA. Original archives are optional; the game has a clean-room fallback. Tests requiring extracted original assets are conditional on their availability. Keep original archives and extracted binaries local.

For browser review, prepare Chromium once, then choose the required evidence:

```sh
bobp make visual-review-setup
bobp make visual-review
bobp make visual-review ARGS=--interactions
```

The first review command captures renderer scenes; `ARGS=--interactions` additionally exercises actual browser input. Setup is **not a frozen install**: npm's matching frozen-install command is `npm ci`, but no current Makefile target invokes it. A from-clean/frozen-install conformance run was not performed for this documentation task.

## 3. Make targets

The [Makefile](../Makefile) is the contributor entry point; recipes call native tools. Run project automation through `bobp make <target>` and discover current targets with `bobp make help`.

| Target | Runs | Notes |
|---|---|---|
| `setup` / `install` | npm install, Python asset extractor, VIA index | May use the network and update dependency resolution; `install` aliases `setup`. |
| `extract-assets` | `python3 scripts/extract_assets.py` | Extracts user-provided local original archives. |
| `test` | ESLint, `tsc --noEmit`, verbose Vitest | Full local regression gate; does **not** pass `ARGS` to Vitest. |
| `test-q` | Quiet Vitest | Targeted iteration: `bobp make test-q ARGS=tests/render/heldCursor.test.ts`. |
| `lint` | ESLint and strict TypeScript checks | No separate secret scan. |
| `typecheck` | `tsc --noEmit` | Types only. |
| `build` | TypeScript check and Vite build | Produces `dist/`. |
| `dev` | Vite on loopback, preferred port `5173` | Vite may choose another port if occupied; read the actual URL from its output. |
| `visual-review-setup` | Pinned temporary Playwright CLI installs Chromium | Requires download access when the browser is absent. |
| `visual-review` | Pinned temporary Playwright runner | Captures under `build/visual-review/`; `ARGS=--interactions` enables input checks. npm exec may use the network. |
| `via-index` | `via index .` | Refresh after symbol changes. |
| `tldr` | VIA index and `bobp tldr` | Its `bobp tldr` failure is masked with `|| true`. |
| `judge-trace` | `bobp trace-annotate --date DATE` | Failure masked with `|| true`; see section 9. |
| `clean` | Removes `dist/` and `build/tldr_prep` | Keeps `node_modules/` and other build evidence; not a full reset. |
| `help` | Lists documented Makefile targets | Inspect recipes if a description and behavior disagree. |

Standard targets absent: `format` (no formatter target configured), `run` (`dev` is the available runner), and `distclean` (no environment-removal target). There are no project targets for frozen install, dependency add/remove, hook installation, secret scanning, publishing or deployment. Additions are mechanism changes, not assumed commands.

`bobp make` writes one shared `build/build.out`. **Run its commands serially across agents**, never concurrently or piped into another command. Inspect the log after completion; preserve relevant results in summaries because later runs replace it.

## 4. Dependencies

- **Add:** Neo edits the appropriate `package.json` dependency section, then runs `bobp make setup` to resolve/install and update `package-lock.json`. Current declared packages are in `devDependencies`; add runtime dependencies only when the feature needs them.
- **Upgrade / remove:** Neo updates/removes the manifest entry, runs `bobp make setup`, and reviews the resulting manifest/lockfile changes. Do not hand-edit the lockfile or mix npm with another manager.
- **Dev-only tools:** Declare project development tools in `devDependencies`. Browser review is the explicit exception: its pinned temporary npm-exec tool and cache are described in sections 1 and 3.
- **Commit afterwards:** `package.json` and `package-lock.json`, together with the dependent code/tests. Review unexpected lockfile churn.
- **Who:** Neo owns ordinary dependency changes. A new package manager, language, runtime pin, frozen-install mechanism or dependency automation target is Tank's mechanism change.

## 5. Quality gates

| Gate | Target / evidence | Required before |
|---|---|---|
| Affected behavior | `bobp make test-q ARGS=<affected test paths>` | Implementation handoff after behavior changes; extend coverage for actual regressions. |
| Full regressions, lint and types | `bobp make test` | Substantive feature handoff / sprint close after relevant changes. Reuse a passing result for unchanged code. |
| Static checks | `bobp make lint` or `typecheck` | Changed code/tests needing those checks when not already covered by `test`. |
| Production bundle | `bobp make build` | Build-affecting changes and release readiness. |
| Observable UX | `bobp make visual-review ARGS=--interactions`, inspected PNGs and browser report | Smith approval for changed UI/input; use original and fallback art where applicable. |
| Final accepted stories | Explicit criterion-to-evidence review by Trin/Morpheus/Smith | Sprint close, including criteria omitted from phase shorthand. |
| Agent trace | `bobp make judge-trace DATE=YYYY-MM-DD` and underlying log inspection | QA process review where available; currently unavailable, not a passing audit. |
| Patch/staged content | `git diff --check`, `git diff --cached --check`, staged-path/content review | Commit; exclude new colon filenames, secrets, original assets and generated outputs. |

**Bounded testing:** do not repeat a passing full suite for unchanged code. Run checks justified by changed code, new tests, a failure or a specific unresolved concern. A docs-only change needs content/link/template validation, not a fresh product test suite. Report exact totals and distinguish an aggregate run from additional targeted checks.

## 6. Change management

This document records how a request becomes done. Report disagreements between it and other project practices to Tank and reconcile the implementation and documentation together; explicit user instructions remain authoritative.

### Change classes

| Class | Examples | Proposed by | Approved by | Must pass | Recorded in |
|---|---|---|---|---|---|
| Routine | Feature, fix, refactor, docs, dependency change under section 4 | User / Cypher story; team may identify defects | Morpheus architecture review, Trin QA; Smith for observable UX. Small maintenance may use a consolidated review. | Applicable section 5 gates | Root `task.md`, relevant docs/state/chat, commit when requested |
| Mechanism | Toolchain, manifest layout, Make targets, gates, CI, this document | Anyone through `@Tank *devops sdlc` | Tank; user authorization for external publication, destructive changes or scope changes | From-clean verification when supported, plus applicable section 5 gates; missing mechanisms remain explicit gaps | This file and `docs/DECISIONS.md` |
| Release / deploy | Version/tag, publish, hosted deployment | Cypher release / Tank deployment proposal | Cypher product close and relevant review gates; user authorizes the external action | Release gates and, for deployment, post-deploy smoke/health verification | Task board, release summary, decisions and any requested tag/changelog |
| Emergency | Hotfix outside a sprint | User or defect triage | Morpheus/Trin review; Smith if UX changes; user for push/deploy | Affected tests and required static/build checks; full suite when the risk warrants it | Chat, state, commit; retrospective at next close |

### Flow

1. **Request** — log the request in `agents/CHAT.md`; read the relevant persona state. Mouse keeps tasks only in root `task.md`. Major planning follows Cypher → Smith → Morpheus → Smith → Mouse → Morpheus; minor maintenance uses the approved fast-track flow.
2. **Branch** — default branch is `main`. Recent user-authorized work was integrated directly there; no enforced branch-naming or pull-request policy is configured. Honor the user's chosen workflow and preserve unrelated working changes.
3. **Implement** — Neo uses VIA before symbol lookup, makes bounded changes, and uses Makefile targets for execution. Behavior changes receive meaningful tests. Reports use `YYYY-MM-DDTHH-MM`; never put `:` in filenames.
4. **Gate** — run the applicable section 5 checks serially; reuse unchanged evidence. Do not claim masked or unavailable checks passed.
5. **Review** — Neo hands to Trin, then Morpheus; Smith tests actual observable behavior when required. Tank reviews infrastructure/mechanism scope. Save persona state and post a handoff before switching. Repeated failed approaches trigger the anti-loop protocol rather than a third blind attempt.
6. **Integrate** — agents commit/push only when the user requests it. Inspect staged changes and filenames first; use a concise imperative commit subject describing the resulting behavior. Fetch/check remote divergence and use a normal non-forced push. The established destination is `git@github.com:drusifer/dm-reloaded.git`, branch `main`; an authorized push to this destination need not be reconfirmed merely because another turn begins. This is not blanket authorization for future pushes or another destination.
7. **Record** — update task status, user-facing docs, decisions/lessons and working memory. Oracle grooms/archives sprint chat, Smith validates the final playable slice, the team records retrospectives, and Cypher announces local sprint completion. External release/deployment is a separate action.

### Rules

- Commit, push, tag, publish and deploy within the user's authorized scope. Do not force push or rewrite published history without explicit authorization.
- Do not commit secrets, `node_modules/`, generated `dist/`/`build/` evidence, original game archives or `public/assets/extracted/`. Inspect `git diff --cached --name-only` and `git diff --cached`; ignore rules alone are not proof. Reject newly introduced colon filenames. Secret scanning is not currently automated here.
- **Rollback:** prefer a reviewed `git revert` of a published bad commit, validate the correction, and push only when authorized. Avoid destructive reset/history rewrite as a default recovery mechanism.
- **Changing this document:** Tank owns edits; update the Last verified line and document the associated mechanism change. User-requested drafting does not imply implementing every known gap below.

## 7. Versioning and release

- **Version lives in:** `package.json` → `version` (currently `0.1.0`), reflected in `package-lock.json`.
- **Bumped:** no automatic versioning/tagging target or mandatory cadence is configured. Cypher coordinates a deliberate version change with Neo when a release requires it; do not bump merely to record a local fix.
- **Artifact:** `bobp make build` produces the Vite bundle in gitignored `dist/`. `package.json` is `private: true`; no npm-publication workflow is configured.
- Sprint close summaries and archives record local delivery. A commit/push does not claim a hosted deployment or successful production smoke test.

## 8. CI / deploy

**None configured for this repository:** no tracked GitHub Actions workflow, project `.githooks/pre-commit`, configured `core.hooksPath`, deployment target, `render.yaml` or Dockerfile was found during this audit. `.github/copilot-instructions.md` is agent guidance, not CI.

Checks run locally. Any future CI must invoke the same Makefile gates as section 5, with Tank maintaining execution order and Trin owning the gate definitions. Hosting configuration, secrets, deploy targets and post-deploy health checks require a separate implementation task. Tank's standard calls for a staged secret-scanning hook; that standard is not yet implemented here.

## 9. Known deviations

- Runtime and npm are unpinned, `engines.node`/`packageManager` are absent, and setup uses mutable `npm install` instead of the JavaScript profile's frozen `npm ci`. A committed lockfile alone does not establish frozen-install conformance.
- No `distclean`, formatter, dependency-operation, hook-install, secret-scan or deployment target exists. Do not run invented targets or silently add mechanisms during documentation work.
- Browser setup/review may use the network outside `install`; temporary Playwright tooling is pinned in the Makefile but outside the project lockfile. This deliberately documents the existing mechanism rather than claiming all tools are environment-local/frozen.
- `judge-trace` masks failure with `|| true`; the observed underlying failure is missing Python `jinja2`. A successful Make exit is not successful trace evidence. `tldr` also masks its wrapper failure.
- `bobp make` shares one log file across runs. Concurrent runs have previously mixed evidence; serial execution is required until the capture mechanism changes.
- No automated CI, secret scan or mandatory staged hook is installed. `.gitignore` currently also lacks an explicit `.env` rule; inspect staged content and never commit credentials.
- Clean-room operation is available without original assets. Asset-dependent tests may skip when binaries are absent, so record whether original-art/data coverage was actually exercised.

## 10. Conformance check

Run by Tank at sprint close (`*devops sdlc-check`), without repeating unchanged product tests merely for status:

1. **From-clean gate:** the template's `distclean → install → test` sequence cannot currently run because `distclean` is absent. For a newly prepared clean checkout, the supported sequence is `bobp make setup`, `bobp make test`, then applicable section 5 gates. Record that this still uses mutable installation; full frozen-install conformance remains unmet. No fresh-checkout rebuild was performed for this documentation-only audit.
2. **Dependencies:** inspect imports through VIA and compare third-party packages with `package.json`/`package-lock.json`. Explicitly account for the temporary pinned browser runner and external prerequisites. Undeclared project dependencies fail the check.
3. **Targets:** compare `bobp make help` and the actual Makefile recipes with section 3. Every listed existing target must exist and retain its stated behavior; absent targets must stay labeled absent.
4. **Entry points:** inspect docs/scripts for advice to bypass `bobp make` or install project tools globally. Any exception must be explicit here, not silently introduced.
5. **Pins/lock/ignores:** inspect the runtime files and manifest fields, `git ls-files package-lock.json`, other tracked lockfiles, and `.gitignore`. Exactly one npm lockfile must be tracked. Pins are currently absent, so agreement and frozen-install lockfile stability cannot be reported as verified.
6. **Change evidence:** verify the class, named approvals and records in section 6, including every accepted story criterion. Inspect `git diff --cached --check`, staged paths and contents before committing; no new colon filenames, secrets, original assets or generated outputs may be staged.
7. **Project-specific evidence:** for changed UI/input, inspect the browser report and PNGs, distinguish scene-only from interaction runs, and record original/fallback coverage. Inspect underlying trace output rather than trusting the masked Make exit. Save Tank state/summary and report deviations instead of declaring unconditional conformance.

---
*Last verified: 2026-11-03 against commit `17cadcc` and the local Makefile/documentation audit by Tank. Product checks were not rerun for this docs-only change; full toolchain conformance remains subject to the deviations above.*
