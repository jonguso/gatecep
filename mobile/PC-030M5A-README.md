# PC-030M5A — Canonical Portfolio-First Home

This increment consolidates the investor Dashboard and Portfolio Hub into one shared, mobile-first screen.

## Investor experience

- Home opens with verified REAL net worth, total return, cash, holdings count, and largest sector.
- Allocation is the default visual view.
- Only the three largest sectors and three largest holdings are shown initially.
- Performance, complete holdings, Journey, Coach G, analytics, and synchronization remain one tap away.
- The old `/portfolio-hub` route remains compatible but renders the same canonical screen.
- The bottom navigation label changes from **My Journey** to **Home**.

## Integrity rules

- Authentication and REAL-data failures never fall back to Practice.
- An unavailable portfolio displays `Unavailable` / `N/A`, not fabricated KES 0 values.
- The legacy Portfolio Hub's hard-coded returns, estimated income, and sample transactions are not used.
- Historical and benchmark results remain owned by the verified `/performance` route.

## Verify

```bash
chmod +x scripts/verify-pc030m5a-portfolio-first-home.sh
bash scripts/verify-pc030m5a-portfolio-first-home.sh
```
