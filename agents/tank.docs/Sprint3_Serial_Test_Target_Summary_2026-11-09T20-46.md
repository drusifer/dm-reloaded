# Sprint 3 Serialized Test Target Summary

## Outcome

Added the project-owned `test-serial` Make target for the user-authorized aggregate-timeout investigation:

```make
npx vitest run --reporter=dot --no-file-parallelism --minWorkers=1 --maxWorkers=1 $(ARGS)
```

The target changes only file/worker concurrency. It does not override Vitest's existing 5000 ms per-test timeout, change dependencies, alter production code, or modify CI/deployment behavior.

## Validation

- `bobp make help`: target is discoverable.
- `bobp make test-serial ARGS="--help"`: passed without running tests.
- Installed Vitest 3.2.7 documents `--fileParallelism`, `--maxWorkers`, and `--minWorkers`; the captured invocation contains all three bounded settings.
- `git diff --check -- Makefile`: passed.

## Trin Commands

Run the six previously timing-sensitive files once:

```text
bobp make test-serial ARGS="tests/render/lightingIntegration.test.ts tests/render/phase2IndependentUat.test.ts tests/render/sideAlcoveUat.test.ts tests/tools/spriteExportCli.test.ts tests/tools/spriteExportSafetyUat.test.ts tests/tools/spriteReviewSafetyUat.test.ts"
```

Only if that passes, run the full serialized aggregate once:

```text
bobp make test-serial
```

Trin retains ownership of the test verdict and all remaining quality gates.
