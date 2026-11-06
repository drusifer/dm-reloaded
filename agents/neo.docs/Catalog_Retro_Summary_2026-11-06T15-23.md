# Catalog Implementation Retrospective

- **Keep:** Centralizing panel/category/icon addressing removed duplication while preserving raw export and runtime fallback behavior. Stable control IDs made actual UAT practical.
- **Change:** Capture user intent before every awaited browser API and add race cases during implementation, not after handoff; clipboard feedback exposed this pattern.
- **Follow-up:** Treat usage previews as pure functions and keep any future editing/persistence outside catalog facts until explicitly designed.
