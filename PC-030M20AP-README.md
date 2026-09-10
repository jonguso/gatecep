# PC-030M20AP — Trade Lab & Broker Action Plan Navigation Boundary

Purpose: remove execution ambiguity from REAL portfolio scenarios while preserving the existing Practice execution simulator.

Changes are intentionally limited to presentation and navigation context:
- REAL Average Cost Simulator becomes `Trade Lab — Average Cost Scenario`.
- REAL scenario controls use `Scenario Inputs`, `Simulate BUY/SELL`, and `Scenario Estimate`.
- `Back to Basket Execution` becomes `Back to Broker Action Plan` for REAL scenario mode.
- REAL return navigation explicitly carries `mode=BROKER_PLAN`.
- Broker-plan `/basket-execution` view is titled `Broker Action Plan Review` and remains advisory-only.
- Practice Basket Simulation remains unchanged for Practice flows.

No FIFO, WAP, fees, transaction evidence, CDSC evidence, REAL holdings, Practice holdings, or broker execution semantics are changed.

Install from `~/gatecep`:

```bash
unzip -o ~/Downloads/gatecep-pc030m20ap-trade-lab-broker-plan-boundary.zip
chmod +x scripts/apply-pc030m20ap-trade-lab-broker-plan-boundary.sh
chmod +x scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh
bash scripts/apply-pc030m20ap-trade-lab-broker-plan-boundary.sh
bash scripts/verify-pc030m20ap-trade-lab-broker-plan-boundary.sh
```
