# PC-030M20AH — Transaction History & Ledger Reconciliation Report

Purpose: diagnose security-specific transaction-history reconciliation gaps without changing accounting logic or forcing broker positions.

Changes:
- Reuses the existing `/transactions` placeholder route as the canonical REAL transaction reconciliation report; no duplicate report screen added.
- Adds read-only portfolio summary: Broker Qty, Ledger Qty, Difference, Status, Excluded count.
- Adds per-security chronological evidence rows with running quantity, FIFO inclusion, REAL eligibility, exclusion reasons and broker reference.
- Exposes excluded/incomplete and duplicate evidence instead of hiding it.
- Adds a `Review Transaction Reconciliation` handoff from Average Cost Simulator only when FIFO evidence is unavailable.
- Does not mutate REAL or Practice portfolios and never invents adjustment shares.

Install from `~/gatecep`:
`unzip -o ~/Downloads/gatecep-pc030m20ah-transaction-ledger-reconciliation.zip`

Verify from `~/gatecep/mobile`:
`chmod +x scripts/verify-pc030m20ah-transaction-reconciliation.sh`
`bash scripts/verify-pc030m20ah-transaction-reconciliation.sh`
`npx expo start --clear --lan`
