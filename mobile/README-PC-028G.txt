PC-028G — Investor Wealth Context Service

Purpose
-------
Make PC-028 use the CURRENT GateCEP investor instead of manually passing
different objects from page to page.

The service assembles one standardized context from the real services already
present in GateCEP.

Context domains
---------------
Investor
Goals
Investor DNA
Portfolio
Cash
Holdings
Orders
Trades
Practice activity
Behavior analytics
Portfolio health
Financial context
Allocation advice
Recent Coach G conversations
Recent life changes

Architecture
------------
Current GateCEP session
        ↓
Existing GateCEP services
        ↓
Investor Wealth Context Service
        ↓
Normalized investor context
        ↓
Wealth Journey Advisor input
        ↓
PC-028A-E
        ↓
PC-028F investor experience
        ↓
Home / Coach G / Goals / Portfolio / Investor DNA

Provider design
---------------
PC-028G does NOT guess the names or APIs of your existing services.

Register the real existing loaders through:

registerGatecepInvestorWealthContextProviders({...})

or individually with:

registerInvestorWealthContextProvider({...})

This prevents duplicating or replacing working GateCEP services.

Readiness
---------
READY
PARTIAL
MINIMAL
UNAVAILABLE

Missing information is reported instead of invented.

Main functions
--------------
registerInvestorWealthContextProvider()
unregisterInvestorWealthContextProvider()
loadRegisteredInvestorWealthContextProviders()
normalizeInvestorWealthContextInput()
loadInvestorWealthContextFromProviders()
calculateInvestorWealthContextReadiness()
buildObservedBehaviorInputs()
buildWealthJourneyAdvisorInput()
buildInvestorWealthContext()
buildCurrentInvestorWealthJourney()
loadCurrentInvestorWealthJourney()
loadCurrentInvestorWealthJourneyHomeCard()
loadCurrentInvestorWealthJourneyCoachGPrompt()
loadCurrentInvestorWealthJourneyGoals()
registerGatecepInvestorWealthContextProviders()

Files
-----
src/features/wealth-journey/investorWealthContextService.js
src/features/wealth-journey/wealthJourneySessionAdapter.js
src/features/wealth-journey/registerGatecepInvestorWealthContextProviders.js
src/features/wealth-journey/index.js

Verify
------
cd ~/gatecep/mobile

grep -n \
  "registerInvestorWealthContextProvider\\|normalizeInvestorWealthContextInput\\|loadInvestorWealthContextFromProviders\\|calculateInvestorWealthContextReadiness\\|buildWealthJourneyAdvisorInput\\|buildInvestorWealthContext\\|buildCurrentInvestorWealthJourney\\|registerGatecepInvestorWealthContextProviders" \
  src/features/wealth-journey/*.js
