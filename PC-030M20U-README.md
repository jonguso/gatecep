# PC-030M20U — Continuous Investor Journey

This package connects the consolidated investor pages into one deterministic journey:

1. Coach Insights
2. Portfolio Analysis
3. Performance
4. Portfolio Risk
5. Holdings
6. Goals & Wealth Journey
7. Activity Evidence
8. Coach G Recommendations

Every overview provides Back, Home, and Continue/Finish. Refresh is supplied only by pages that reload changing REAL portfolio evidence. Existing focused detail panels keep their internal Previous/Next behavior before the investor advances to the next page.

## Apply and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m20u-continuous-investor-journey.zip

cd mobile
bash scripts/verify-pc030m20u-continuous-investor-journey.sh
npx expo start --clear --lan
```
