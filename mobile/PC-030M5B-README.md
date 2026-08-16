# PC-030M5B — Sector Tap and Security Holdings Correction

This patch corrects two mobile interaction gaps discovered after PC-030M5A.

## Corrections

- Allocation chart slices remain visual; explicit native sector rows now own drill-down interaction.
- Sector controls show touch feedback, accessibility labels, a chevron, and an Expo-safe modal.
- Investors can expand from the top three sectors to every sector without leaving Home.
- **View All Holdings** now opens a flat list of actual securities rather than sector cards.
- Each security expands to quantity, average cost, market price, invested value, current value, and return.
- Holdings continue to use canonical REAL runtime data and never fall back to Practice.
- Missing REAL data remains `N/A`, not a fabricated zero balance.

## Verify

```bash
chmod +x scripts/verify-pc030m5b-sector-holdings.sh
bash scripts/verify-pc030m5b-sector-holdings.sh
```
