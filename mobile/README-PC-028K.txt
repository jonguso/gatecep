PC-028K — Investor Journey Continuity Bridge

Problem confirmed
-----------------
GateCEP currently has two valid sets of data for the SAME investor:

1. Initial journey
   - Investor DNA
   - goal intention
   - risk / investor type
   - practice journey

2. Actual investing
   - uploaded valuation report
   - 12 real holdings
   - real portfolio value
   - cash / transaction upload status

The Portfolio Hub can see the uploaded real portfolio, but Wealth Journey
was still operating mainly from the original Investor DNA context.

PC-028K fixes that gap.

Confirmed existing real data services
-------------------------------------
loadInvestorContext()
loadUnifiedPortfolio({ broker: "ALL" })
buildSyncStatus()

Architecture
------------
Initial discussion / DNA
        +
Practice evidence
        +
Uploaded actual holdings
        +
Cash / transaction sync state
        ↓
Investor Journey Continuity Bridge
        ↓
ONE canonical current investor journey
        ↓
PC-028G Wealth Context
        ↓
Coach G Wealth Journey

Critical rules
--------------
- Uploaded portfolio data enriches the SAME investor.
- It does not create a second investor profile.
- Actual portfolio evidence becomes the primary current financial position.
- Practice data is retained as historical behavioral evidence.
- Investor DNA remains contextual evidence and is not overwritten by holdings.
- An incomplete goal can show the investor's real current financial position,
  while target/projected values remain Not set.

Expected current-user outcome
-----------------------------
For goal "family":

Current:
  Real portfolio value from loadUnifiedPortfolio / sync state

Target:
  Not set

Projected:
  Not set

Coach G:
  "I can see what you have already built, but I still need to understand
   what family means financially and by when before I can tell whether
   you are on track."

Files
-----
src/features/wealth-journey/investorJourneyContinuityBridge.js
src/features/wealth-journey/wealthJourneyContinuityAdapter.js
src/features/wealth-journey/registerContinuityWealthJourneyProviders.js
src/features/wealth-journey/realWealthJourneyRuntime.js
src/features/wealth-journey/wealthJourneyRuntimeContinuityPatch.js
src/features/wealth-journey/index.js

Verify
------
cd ~/gatecep/mobile

grep -n \
  "buildInitialJourneyEvidence\\|buildPracticeJourneyEvidence\\|buildActualInvestingEvidence\\|choosePrimaryInvestmentEvidence\\|buildCanonicalInvestorJourneyContext\\|loadCanonicalInvestorJourneyContext\\|adaptCanonicalJourneyToWealthContext\\|registerContinuityWealthJourneyProviders\\|loadRealCurrentInvestorWealthJourney" \
  src/features/wealth-journey/*.js

Then refresh:
/wealth-journey
