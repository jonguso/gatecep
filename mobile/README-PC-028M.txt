PC-028M — Dashboard & Portfolio Hub Source Integration

Purpose
-------
Make Dashboard and Portfolio Hub consume the same PC-028L canonical
portfolio-source policy.

Behavior
--------
If real broker/imported data exists:
  default = ALL

If there is no real data:
  default = PRACTICE

ALL
---
Includes:
- broker accounts
- imported actual portfolios

Excludes:
- Practice Portfolio

Dashboard
---------
Adds a reusable DashboardPortfolioSourcePanel and shared source state.

Visible Practice mode clearly says:
"Practice Portfolio · Simulated learning environment · No real money"

Practice may be displayed but may NOT drive:
- real net worth
- real goal progress
- Wealth Journey
- Investor DNA reconciliation
- recommendation compliance

Portfolio Hub
-------------
Uses the same canonical selector catalog:

All Accounts
Broker A
Broker B
Imported Portfolio
Practice Portfolio

Selecting an account changes the VIEW only.

Files
-----
src/features/portfolio-source/dashboardPortfolioSourceService.js
src/features/portfolio-source/portfolioHubSourceService.js
src/features/portfolio-source/components/PortfolioSourceSelector.js
src/features/portfolio-source/components/PortfolioSourceBanner.js
src/features/portfolio-source/components/DashboardPortfolioSourcePanel.js
src/features/portfolio-source/index.js

app/dashboard-PC-028M-integration.js
app/portfolio-hub-PC-028M-integration.js

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildDashboardPortfolioSourceState\|buildPortfolioHubSourceState\|PortfolioSourceSelector\|PortfolioSourceBanner\|DashboardPortfolioSourcePanel" \
  src/features/portfolio-source/*.js \
  src/features/portfolio-source/components/*.js

Next runtime check
------------------
After integrating the two supplied guides:

1. Dashboard defaults to All Accounts when actual data exists.
2. Portfolio Hub defaults to All Accounts when actual data exists.
3. Practice remains selectable.
4. All Accounts never changes when Practice changes.
5. Wealth Journey continues to use actual data only.
