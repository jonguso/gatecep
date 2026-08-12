PC-028F — Wealth Journey Investor Experience Integration

Purpose
-------
Surface PC-028 inside the investor's normal GateCEP experience.

The investor should see:
- Am I on track?
- What matters now?
- What should I discuss with Coach G?
- What should I do next?

The investor should not need to navigate:
- goal progress engine
- recovery planner
- behavior alignment engine
- DNA evidence engine

New route
---------
/wealth-journey

Investor surfaces
-----------------
Home
Coach G
Goals
Portfolio
Investor DNA

Core files
----------
src/features/wealth-journey/wealthJourneyExperienceService.js
src/features/wealth-journey/components/WealthJourneyHomeCard.js
src/features/wealth-journey/components/CoachGWealthJourneyCard.js
src/features/wealth-journey/components/WealthJourneyGoalCard.js
app/wealth-journey.js

Patch guides
------------
app/home-PC-028F-patch.js
app/coach-g-PC-028F-patch.js
app/goals-PC-028F-patch.js
app/portfolio-PC-028F-patch.js
app/investor-dna-PC-028F-patch.js
app/main-navigation-PC-028F-patch.js

Important
---------
PC-028F provides the investor experience surfaces and integration contract.
The production app should pass the current investor session's real goals,
portfolio, cash, behavior, Investor DNA and related context into
buildWealthJourneyInvestorExperience().

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildWealthJourneyInvestorExperience\\|buildWealthJourneyHomeCard\\|buildWealthJourneyCoachGPrompt\\|buildWealthJourneyGoalsSummary\\|buildWealthJourneyPortfolioContext\\|buildWealthJourneyDNAContext\\|WealthJourneyScreen\\|WealthJourneyHomeCard\\|CoachGWealthJourneyCard\\|WealthJourneyGoalCard" \
  src/features/wealth-journey/wealthJourneyExperienceService.js \
  src/features/wealth-journey/components/*.js \
  app/wealth-journey.js
