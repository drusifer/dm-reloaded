# Asset Export Mechanism Review

APPROVED for implementation against docs/SPRINT_ASSET_EXPORT.md AE-1–AE-8 and docs/SDLC.md mechanism-class rules. This is a scoped local exporter, not a runtime/CI/deployment migration.

Concrete proposed interface: bobp make export-sprites, with SPRITE_INPUT defaulting to public/assets/extracted/dm1/graphics.dat and SPRITE_OUTPUT defaulting to build/sprites; quote path variables in Make recipes. ARGS may expose CLI help/options. A focused export-sprites-review target may reuse the existing pinned temporary Playwright/Chromium mechanism. Exact final recipes must be checked after implementation and reflected in SDLC and README.

Runner: Node .mjs plus installed Vite SSR loading of existing parseGraphicsDat, with no listening server/native TypeScript-resolution assumption and no new dependencies or version pins. Native Buffer/zlib PNG encoding is contained; independent browser decoding verifies output rather than a production encoder oracle.

Safety/ownership: only resolved output inside ignored build subtree, including symlink boundaries; no recursive directory deletion, unrelated sentinel overwrite or unsafe prior-manifest pruning. Complete-source validation must reject missing/truncated/corrupt inputs before publication rather than trusting the existing parser's possible partial return. Validate all names and collisions before publishing; stage outputs or equivalent. Preserve input bytes/hash, deterministic manifest/PNG bytes, relative portable paths and sparse verified labels. Index0 transparent; no unsupported claim that exports universally replace runtime masks.

No Makefile/SDLC target edits yet: approval precedes implementation, and documentation must describe real recipes only. No product checks run against unchanged code; no package, CI, hook, pin, secret/deploy implementation authorized. Current missing tooling remains documented rather than silently expanded. Parent owns serial make scheduling, task board and planning gates.
