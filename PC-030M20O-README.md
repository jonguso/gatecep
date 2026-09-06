# PC-030M20O — Progressive Holdings

This patch simplifies the REAL Holdings journey for investors:

- The initial screen shows a compact, scrollable list of securities.
- Each row displays symbol, company, sector/broker, current value, gain/loss, and portfolio weight.
- Tapping one row opens only that security’s complete position details.
- Back first returns from the detailed card to the Holdings list, then to the actual previous page.
- Home remains an independent action at the top.
- REAL evidence and Practice isolation remain unchanged.

## Verify

From `mobile`:

```bash
bash scripts/verify-pc030m20o-progressive-holdings.sh
npx expo start --clear --lan
```
