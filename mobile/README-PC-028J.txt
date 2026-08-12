PC-028J — Runtime Data Shape Reconciliation

Runtime problem confirmed
-------------------------
The real /wealth-journey screen successfully loaded the current investor,
but the stored goal "family" was an intention-only goal.

The previous runtime incorrectly showed:
- READY
- Current KES 0
- Target KES 0
- Projected KES 0
- Review realistic recovery options

That was semantically wrong because there was no target amount or target date.

PC-028J fixes
-------------
1. Classifies each goal as:
   INTENT_ONLY
   PARTIAL
   PLANNABLE

2. A READY context with no PLANNABLE goal is reconciled to PARTIAL.

3. Missing financial values remain null and display as:
   Not set

4. NOT_ENOUGH_DATA no longer triggers a recovery plan.

5. Coach G's next action becomes:
   Complete this goal with Coach G

6. Coach G asks a natural clarification question such as:
   "When you say family, what would success look like financially,
    and by when would you like to achieve it?"

7. No target amount, target date or projected value is fabricated.

Files
-----
src/features/wealth-journey/wealthJourneyRuntimeReconciliation.js
src/features/wealth-journey/realWealthJourneyRuntime.js
src/features/wealth-journey/components/WealthJourneyGoalCard.js
src/features/wealth-journey/index.js

Verify
------
cd ~/gatecep/mobile

grep -n \
  "classifyWealthJourneyGoalCompleteness\\|buildMissingGoalPlanningFields\\|reconcileGoalAdviceForRuntime\\|reconcileWealthJourneyGoalsSummary\\|reconcileWealthJourneyRuntimeResult\\|loadRealCurrentInvestorWealthJourney\\|formatMoney" \
  src/features/wealth-journey/*.js \
  src/features/wealth-journey/components/*.js

Then refresh:
/wealth-journey

Expected for the current "family" goal
--------------------------------------
Status: PARTIAL
Goal status: Goal needs details
Current: Not set or real available value if known
Target: Not set
Projected: Not set
Next: Complete this goal with Coach G

There should be no "Review realistic recovery options" until the goal has
enough information to measure a real gap.
