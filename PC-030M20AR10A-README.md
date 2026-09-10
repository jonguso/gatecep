# PC-030M20AR10A — M20AR8 FIFO Boundary Verifier Correction

Verification-only correction.

M20AR10 intentionally moved the investor-facing FIFO explanation from `app/trade.js`
into `coachGProjectedImpactService.js`, where the action-aware interpretation is built.
The old M20AR8 verifier still searched only `trade.js` for the exact phrase
`FIFO-aware sale analysis`, causing a false regression failure.

This patch updates the M20AR8 verifier to validate the actual architecture:
- `trade.js` still passes `averageGuard` into `buildProjectedImpactReview`;
- the projected-impact service still gates SELL on `averageGuard.available`;
- remaining quantity, remaining WAP, released cost basis and realized P/L still come
  from `averageGuard`;
- the FIFO-aware SELL evidence boundary remains explicit;
- Broker Action Plan and REAL-portfolio integrity checks remain unchanged.

No runtime application code is changed.
