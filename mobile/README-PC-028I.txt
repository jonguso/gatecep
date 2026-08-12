PC-028I — Wealth Journey Screen Real Runtime Integration

Purpose
-------
Make /wealth-journey use the current GateCEP investor directly.

This replaces the PC-028F route-param development contract with:

loadRealCurrentInvestorWealthJourney()

from PC-028H.

The screen now handles:
-----------------------
LOADING
ERROR
UNAVAILABLE
MINIMAL
PARTIAL
READY
NO ACTIVE / TRACKABLE GOAL

Investor experience
-------------------
The investor sees:
- readiness of their wealth journey
- goal counts
- on-track goals
- goals needing attention
- achieved goals
- Coach G priority
- goal cards
- portfolio / goal context
- what GateCEP is learning about Investor DNA
- missing-source warnings without fabricated data

Important
---------
The screen remains investor-facing.

It does not expose:
- goal progress engine
- recovery planner
- behavior alignment engine
- DNA evidence engine
- provider internals

Install
-------
Replace:

app/wealth-journey.js

with the included version.

Verify
------
cd ~/gatecep/mobile

grep -n \
  "loadRealCurrentInvestorWealthJourney\\|WealthJourneyScreen\\|ReadinessBanner\\|CoachPriority\\|PortfolioGoalContext\\|DNAContext\\|NoGoalState\\|NoJourneyDataState\\|ErrorState" \
  app/wealth-journey.js
