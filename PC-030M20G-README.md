# PC-030M20G — Coach G REAL/Practice Separation

This patch makes the Coach G boundary explicit:

- `/(tabs)/coach` is the canonical REAL advisory workspace.
- `/coach-insights` is the Practice Coach G Lab.
- Dashboard Coach G links open the REAL workspace.
- Practice Order Book and Practice Trade History appear only in the Practice Lab.
- Simulated strategies use `practiceCoachRecommendationHistory`, never canonical `recommendationHistory`.
- The Practice Lab may read the REAL portfolio only as a read-only scenario baseline; it cannot alter REAL holdings or create broker evidence.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20g-coach-real-practice-separation.sh
```
