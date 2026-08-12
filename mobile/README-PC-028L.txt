PC-028L — Canonical Portfolio Source & Wealth Activation

Permanent rules
---------------
PRACTICE
- learning only
- simulation only
- familiarization only
- free/demo experience
- NEVER DNA evidence
- NEVER Wealth Journey evidence
- NEVER recommendation-compliance evidence
- NEVER part of ALL ACCOUNTS

REAL SOURCES
- broker account
- imported portfolio
- synchronized actual account
- actual cash / holdings / transactions

ALL ACCOUNTS
- aggregates REAL sources only
- explicitly excludes Practice

Default source
--------------
If any real source exists:
  ALL

If no real source exists:
  PRACTICE

Wealth Journey
--------------
If real data exists:
  ACTIVE

If Practice only:
  PRACTICE_ONLY

Investor DNA
------------
Initial DNA comes from signup/onboarding.

When actual financial evidence arrives:
- it does not create a new DNA
- it reconciles against the existing DNA
- Practice activity is excluded from reconciliation

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildPortfolioSourceCatalog\|buildAllAccountsPortfolio\|determineDefaultPortfolioSource\|classifyWealthActivation\|buildCanonicalRealWealthContext\|loadActivatedWealthJourneyContext\|buildCanonicalPortfolioView\|loadRealCurrentInvestorWealthJourney" \
  src/features/portfolio-source/*.js \
  src/features/wealth-journey/*.js
