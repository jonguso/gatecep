PC-028Q — Shared Portfolio Engine Adoption

Source of truth:
~/gatecep/shared/portfolio/engine.js

The shared engine owns:
- holding valuation
- portfolio value
- invested value
- cash
- gain/loss
- net worth
- goal progress helper

Canonical formula:
netWorth = totalValue + totalCash

PC-028Q applies the shared engine to:
1. Dashboard
2. Portfolio Hub
3. canonicalRealWealthMetricsService

Important:
The Dashboard's old buildPortfolioSummary remains temporarily only to locate
existing cash/day-change data. Its valuation totals are overridden by the
shared engine. A later cleanup can remove it after cash/day-change sources are
fully centralized.

Practice:
Uses the same arithmetic but remains simulation only and is excluded from real
Wealth Journey and DNA reconciliation.

Prerequisite:
~/gatecep/shared/portfolio/engine.js must already exist.

Install:
cd ~/gatecep/mobile
python scripts/apply-pc028q.py
bash scripts/verify-pc028q.sh
npx expo start -c

Backups:
app/(tabs)/dashboard.js.pc028q.bak
app/portfolio-hub.js.pc028q.bak
src/features/wealth-journey/canonicalRealWealthMetricsService.js.pc028q.bak
