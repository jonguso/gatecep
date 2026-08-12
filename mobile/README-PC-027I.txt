PC-027I — Corporate Action Investor Experience Integration

Purpose
-------
Surface PC-027 in the investor's normal GateCEP journey instead of exposing
another collection of technical engines.

New route
---------
/corporate-actions

New investor-facing service
---------------------------
corporateActionExperienceService.js

It creates three simple surfaces:
1. Home card
2. Portfolio card
3. Coach G prompt

Components
----------
CoachGCorporateActionCard.js
PortfolioCorporateActionCard.js

Integration philosophy
----------------------
Corporate Actions should NOT become a primary bottom-navigation tab.

Instead:

HOME
Show only when something relevant needs attention.

PORTFOLIO
Show expected income, decisions and share changes.

COACH G
Surface the personalized explanation / recommendation naturally.

SECONDARY MENU
Always provide a route to /corporate-actions for investors who want to review
the full history.

Important
---------
The current PC-027A registry is in-memory. PC-027I reads from that registry
when actions are not explicitly supplied.

The later persistent corporate-action data source can replace the registry
without changing these investor-facing components.

Files
-----
src/features/corporate-actions/corporateActionExperienceService.js
src/features/corporate-actions/components/CoachGCorporateActionCard.js
src/features/corporate-actions/components/PortfolioCorporateActionCard.js
src/features/corporate-actions/index.js
app/corporate-actions.js
app/home-PC-027I-patch.js
app/portfolio-PC-027I-patch.js
app/coach-g-PC-027I-patch.js
app/main-navigation-PC-027I-patch.js

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildCorporateActionInvestorExperience\\|buildHomeCorporateActionCard\\|buildPortfolioCorporateActionCard\\|buildCoachGCorporateActionPrompt\\|CorporateActionsScreen\\|CoachGCorporateActionCard\\|PortfolioCorporateActionCard" \
  src/features/corporate-actions/corporateActionExperienceService.js \
  src/features/corporate-actions/components/*.js \
  app/corporate-actions.js
