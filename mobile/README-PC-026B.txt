PC-026B — Fundamental Operations Alerts and Health Service

File:

  src/features/fundamentals/operations/fundamentalOperationsHealthService.js

Main functions:

- buildRepositoryOperationsAnalysis()
- buildFilingOperationsAnalysis()
- buildSubmissionOperationsAnalysis()
- calculateFundamentalOperationsScore()
- buildFundamentalOperationsPriorities()
- classifyFundamentalOperationsHealth()
- buildFundamentalOperationsAlerts()
- buildFundamentalOperationsHealth()
- buildFundamentalOperationsSummary()
- loadFundamentalOperationsPriorities()
- loadFundamentalOperationsAlerts()
- loadCriticalFundamentalOperationsAlerts()
- loadHighPriorityFundamentalOperationsAlerts()
- loadTopFundamentalOperationsPriority()
- loadFundamentalRepositoryOperationsHealth()
- loadFundamentalFilingOperationsHealth()
- loadFundamentalSubmissionOperationsHealth()

This service centralizes the operational calculations previously embedded
in PC-026A so they can be reused by Coach G, executive dashboards,
notifications, and future background monitoring.

Verify:

  grep -n \
    "buildFundamentalOperationsHealth\|buildFundamentalOperationsSummary\|buildFundamentalOperationsPriorities\|buildFundamentalOperationsAlerts\|calculateFundamentalOperationsScore\|classifyFundamentalOperationsHealth\|loadHighPriorityFundamentalOperationsAlerts\|loadTopFundamentalOperationsPriority" \
    src/features/fundamentals/operations/fundamentalOperationsHealthService.js
