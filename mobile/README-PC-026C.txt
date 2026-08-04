PC-026C — Coach G Fundamental Operations Advisor

File:

  src/features/fundamentals/operations/coachGFundamentalOperationsAdvisor.js

Main functions:

- buildCoachGFundamentalOperationsAction()
- buildCoachGFundamentalOperationsAdvice()
- buildCoachGFundamentalOperationsSummary()
- loadCoachGFundamentalOperationsActions()
- loadCoachGCriticalFundamentalOperationsActions()
- loadCoachGHighPriorityFundamentalOperationsActions()
- loadCoachGTopFundamentalOperationsAction()
- loadCoachGFundamentalOperationsStrengths()
- loadCoachGFundamentalOperationsWeaknesses()
- loadCoachGFundamentalOperationsNarrative()
- loadCoachGFundamentalOperationsAlerts()

The advisor converts PC-026B health, priorities, and alerts into:

- executive recommendations,
- ranked actions,
- action reasons,
- workflow steps,
- direct route links,
- strengths and weaknesses,
- Coach G executive narrative.

It remains advisory only and never verifies, approves, promotes, or fabricates data.

Verify:

  grep -n \
    "buildCoachGFundamentalOperationsAdvice\|buildCoachGFundamentalOperationsSummary\|loadCoachGFundamentalOperationsActions\|loadCoachGCriticalFundamentalOperationsActions\|loadCoachGHighPriorityFundamentalOperationsActions\|loadCoachGTopFundamentalOperationsAction\|loadCoachGFundamentalOperationsNarrative" \
    src/features/fundamentals/operations/coachGFundamentalOperationsAdvisor.js
