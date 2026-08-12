# PC-030C2C8 — Runtime Contract and Integrity Hardening

This patch extends PC-030C2C7 without replacing the existing benchmark,
Wealth Journey, canonical REAL Net Worth, or historical-performance engines.

## Apply

Extract the archive into `gatecep/mobile`, preserving its folder structure and
allowing the included files to replace their existing paths.

## Verify

From Git Bash in `~/gatecep/mobile`:

```bash
chmod +x scripts/verify-pc030c2c8.sh
bash scripts/verify-pc030c2c8.sh
```

The verifier executes nine runtime contract scenarios, audits visible routes,
and performs a production-style Expo web export.

## Integrity rules covered

- Missing benchmark history remains N/A.
- Two to four matched observations remain N/A.
- Preliminary genuine history is labeled and may be compared.
- No zero-return substitution or synthetic benchmark evidence is introduced.
- Amount-only goals show progress but no on-track/behind classification.
- Dated goals reuse existing trajectory evidence.
- Achieved goals do not require a fabricated trajectory.
- Practice-only context cannot create REAL goal progress.
- Route auditing fails when pointed at an empty or incorrect project root.
