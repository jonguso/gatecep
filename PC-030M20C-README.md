# PC-030M20C — Production Dependency Security

This patch performs a controlled production dependency remediation without forcing an incompatible Expo upgrade.

## Remediated

- Axios upgraded and locked to 1.20.0, outside the reported vulnerable range.
- Expo upgraded within SDK 54 to 54.0.37.
- Expo Constants and File System aligned with Expo's SDK 54 compatibility check.
- Missing Expo Audio and Speech lockfile entries restored by a clean dependency install.
- The critical audit count is reduced from 1 to 0 in the audited dependency snapshot.

## Spreadsheet containment

The npm registry provides no fixed version of the direct `xlsx` package. Until it is replaced, all four spreadsheet entry points now enforce:

- CSV/XLS/XLSX extensions only;
- a 5 MB file limit;
- a 10,000-row limit;
- bounded worksheet parsing;
- formulas, HTML, styling, and VBA disabled during parsing.

This is containment, not a claim that the upstream package vulnerability is fixed.

## Verify

```bash
cd mobile
npm install
bash scripts/verify-pc030m20c-production-dependency-security.sh
npx expo install --check
```

Do not run `npm audit fix --force`; npm currently proposes Expo SDK 57, which is a major framework migration and must be tested as a separate milestone.
