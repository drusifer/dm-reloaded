# Catalog QA Retrospective

- **Keep:** Actual browser evidence preceded the intentionally unrun independent file, then one aggregate/build gate; this made chronology auditable and avoided redundant suites.
- **Change:** Independent pixel checks must assert the documented mask contract, not assume a representative crop contains every mask value. The torch `holes > 0` requirement was invented.
- **Follow-up:** Repair trace-audit dependency/exit propagation separately so QA process evidence cannot be mistaken for a pass.
