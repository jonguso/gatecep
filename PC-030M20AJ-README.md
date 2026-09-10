# PC-030M20AJ — Transaction Date Normalization & Anchor-Window Reconciliation

Purpose: fix the live UAT defect where spreadsheet serial dates (for example 46204/46245/46248) were rendered as years and prevented reliable reconciliation against monthly CDSC settlement-date anchors.

## Changes
- Adds source-aware transaction date normalization.
- Converts Excel 1900-system serials before generic JavaScript date parsing.
- Preserves raw imported date values and records the normalization method.
- Separates execution/trade date from explicit settlement date.
- Classifies transaction evidence as before, inside, or after the latest CDSC statement period.
- Adds an anchor-window ledger that starts from CDSC opening balance and applies only in-period broker transactions; pre-statement history remains visible but cannot contaminate the month-end quantity checkpoint.
- Reconciles split CDSC movements against aggregated broker quantities.
- When the broker has only trade/execution date, permits a clearly labelled settlement-window quantity alignment (up to 7 calendar days) without inventing or overwriting settlementDate.
- Explicit settlementDate remains authoritative and takes precedence.
- Extends /transactions with normalized/raw date columns, anchor-window diagnostics, and CDSC↔broker date-bucket detail.

## Integrity boundary
This increment is analytical and read-only. It does not edit imported evidence, create transactions, change REAL/Practice positions, or invent settlement dates. Settlement-window matches are explicitly labelled provisional date alignments.

## Install
From `~/gatecep`:

```bash
unzip -o ~/Downloads/gatecep-pc030m20aj-transaction-date-anchor-window.zip
cd mobile
chmod +x scripts/verify-pc030m20aj-transaction-date-anchor-window.sh
bash scripts/verify-pc030m20aj-transaction-date-anchor-window.sh
```

## M20AJ1 regression hotfix
- `classifyAgainstStatement()` now safely returns `STATEMENT_PERIOD_UNAVAILABLE` when no CDSC statement is loaded.
- Preserves M20AH compatibility for transaction reconciliation without a monthly position register.
