# PC-030M20AR9A — Legacy Dialogue Regression Contract Correction

This is a verification-only correction.

M20AR9 intentionally adds `actionAware: true` to the Coach G dialogue integrity metadata.
The older M20AR4 regression used `deepStrictEqual()` against the entire metadata object,
so the valid additive field caused a false failure.

This patch:
- changes no application/runtime code;
- keeps all original M20AR4 integrity assertions;
- verifies required fields individually instead of forbidding additive metadata;
- explicitly accepts and checks `actionAware: true` when present;
- re-runs M20AR9 and the prior UI regression chain.

No portfolio, FIFO/WAP, Investor DNA, goal, security-master, or Broker Action Plan logic is changed.
