# PC-030M20AQ — Coach G Decision Lab

Transforms the existing Home → Trading destination into an investor Decision Lab while preserving the detailed `/trade` scenario engine and existing broker evidence tabs.

## Purpose
- Test hypothetical decisions without placing REAL trades.
- Show the current portfolio evidence baseline.
- Explain downside/recovery math (10/20/30/40/50% stress).
- Establish evidence-based Conservative / Balanced / Aggressive classification helpers.
- Connect decision testing to existing Wealth Journey goal/recovery context.
- Preserve Broker Action Plan as advisory handoff only.
- Preserve Account / Orders / Depth / Activity as Broker Evidence.

## Integrity
This increment is read-only. It does not mutate REAL holdings, Practice holdings, CDSC statements, transaction evidence, cash ledgers, goals, Investor DNA, or broker execution evidence.

Risk labels are not forecasts. `classifyDecisionRisk()` requires explicit evidence inputs and returns reasons. Recovery percentages are deterministic arithmetic: recovery = loss / (100-loss).

## Install
From `~/gatecep`:

```bash
unzip -o ~/Downloads/gatecep-pc030m20aq-coach-g-decision-lab.zip
chmod +x scripts/apply-pc030m20aq-coach-g-decision-lab.sh
chmod +x scripts/verify-pc030m20aq-coach-g-decision-lab.sh
bash scripts/apply-pc030m20aq-coach-g-decision-lab.sh
bash scripts/verify-pc030m20aq-coach-g-decision-lab.sh
```

Then restart Expo from `~/gatecep/mobile` with `npx expo start --clear --lan`.
