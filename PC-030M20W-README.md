# PC-030M20W — Portfolio-Aware News and Corporate Action Alerts

This package adds an advisory-only portfolio-impact layer to the existing News, Calendar, and Intelligence Center surfaces.

- Verified news and explicit corporate-action dates are checked against Unified Portfolio holdings.
- Alerts show holdings, exposure, portfolio weight, sector context, evidence confidence, and source attribution.
- Cum/ex-dividend alerts explain eligibility uncertainty and estimate gross income only when both quantity and dividend per share are known.
- Unverified or merely reported headlines cannot generate Buy, Sell, or Reduce guidance.
- A verified material lifecycle event may generate `Consider Reducing`, but it never creates or submits a trade.
- All alerts open one read-only investor alert review route with a scenario handoff.

## Apply and verify

```bash
cd ~/gatecep
unzip -o ~/Downloads/gatecep-pc030m20w-portfolio-aware-investor-alerts.zip

cd mobile
bash scripts/verify-pc030m20w-portfolio-aware-investor-alerts.sh
npx expo start --clear --lan
```
