# PC-030M20AT2C — BUY Auto-Quantity Handoff Correction

UAT showed SELL correctly auto-populating quantity from a KES scenario amount while BUY could remain at 0 for a new security (`Cost Basis Source: NOT HELD`).

The existing quantity calculator already supports charge-aware BUY sizing. This correction fixes the Trade Lab handoff/normalization layer:

- scenario budget can arrive as `decisionAmount`, `proposedAmount`, or `amount`;
- BUY quantity does not require an existing holding;
- BUY still includes known percentage/fixed charges before deriving whole-share quantity;
- manual quantity edits still win;
- SELL remains capped to the actual held quantity.

Example: KES 25,000 at KES 37.00 with 1.64% known percentage charges derives approximately 664 BUY shares and remains within the KES 25,000 scenario budget.

This is scenario convenience only. It does not create execution evidence or mutate REAL/Practice portfolios.
