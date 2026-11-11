# Sprint 3 Aggregate Timeout Diagnosis

## Verdict

The captured evidence is consistent with aggregate test-infrastructure/resource instability, not a demonstrated product regression from the two stabilization fixes.

This is not a release pass: the required aggregate gate is still red, and downstream lint/type/build/browser gates correctly remain blocked.

## Evidence

- The focused stabilization set passed 3/3 files and 35/35 tests, including all original inventory-identity and approaching-projectile failures plus independent 10-vector and 32-combination regression matrices.
- The immediately following aggregate reached 324/339 passing tests. Its 15 failures are distributed across six unrelated render and offline-tool files.
- The failures share a 5000 ms deadline rather than a common assertion. One child process returned `status: null`, and an interrupted safety test produced secondary `ENOTEMPTY` cleanup evidence.
- `phase2IndependentUat.test.ts` passed immediately in the focused run, then two cases in that unchanged file timed out only under the aggregate.
- No deterministic assertion failed in combat, inventory ownership, projectile engine state, magic, effects, interaction, or formula presentation.
- Vitest currently uses default parallelism and the default 5000 ms timeout; `vite.config.ts` sets neither worker limits nor file-serialization. The aggregate concurrently exercises framebuffer-heavy render cases and multiple child-process/export safety cases.

The most likely mechanism is worker/file concurrency causing CPU and child-process contention until unrelated cases exceed the common default timeout. Raising every timeout without controlling concurrency would hide the cause and is not recommended.

## Smallest Separately Authorized Scope

Authorize a test-harness-only investigation with no product changes:

1. Add one repeatable project-owned Make target/config path for a serialized Vitest aggregate (`fileParallelism: false`, one worker) while retaining the existing 5000 ms per-test deadline and reporter.
2. Run the six previously failing files once through that serialized target.
3. Only if that set passes, run the full aggregate once through the same serialized target.
4. Compare wall time and failures with the captured parallel run. Do not modify product code, expectations, fixtures, or cleanup behavior during this experiment.

If the serialized six-file set still times out, stop and profile the specific slow cases before changing any timeout. A timeout increase should be case-specific and justified by measured isolated runtime, not applied globally.

## Rerun Disposition

Another run of the unchanged `bobp make test-q` configuration is not justified: it would repeat the same uncontrolled resource conditions and violate bounded-testing guidance.

An unchanged test suite may be rerun only after the concrete harness/config change above, because serialization materially changes the execution environment being tested. The first permitted rerun is the six-file diagnostic set; a full aggregate is permitted once only if that diagnostic passes.

No source, test, Make, Vitest, or task-board files were changed during this diagnosis.
