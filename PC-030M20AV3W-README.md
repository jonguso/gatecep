# PC-030M20AV3W — Active Route Usage & Legacy Candidate Audit

Purpose: stop responsive work from patching legacy/orphan screens merely because
the route file exists.

This audit examines the remaining consequential/dev-utility candidates and classifies:
- ACTIVE_REFERENCED
- UNREFERENCED_LEGACY_CANDIDATE
- MISSING_FILE

A route is ACTIVE_REFERENCED when another current `mobile/app` or `mobile/src`
JS/TS source file contains a static reference to that route. The target route file
does not count as its own reference.

Important:
- This is discovery-only.
- It does not patch, rename, move, or delete any application file.
- Static analysis cannot prove a route is unused if it is launched dynamically,
  by deep-link configuration, or externally.
- Unreferenced results are legacy candidates for review, not automatic deletion.

This supersedes continuing AV3V recovery blindly. AV3V already modified
execution-audit and execution-bridge; execution-wizard was not modified by the
failed recovery attempts.
