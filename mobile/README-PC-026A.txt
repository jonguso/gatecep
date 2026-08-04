PC-026A — Fundamental Data Operations Center

File:

  app/fundamental-operations-center.js

Route:

  http://localhost:8081/fundamental-operations-center

The dashboard combines:

- fundamental repository quality,
- research readiness,
- seed and schema metadata,
- filing lifecycle counts,
- filing review queue,
- approved, rejected, and superseded filings,
- duplicate and revision alerts,
- submission history,
- failed and blocked submissions,
- retry activity,
- generated operational priorities,
- direct navigation to all fundamental-data workspaces.

Required earlier phases:

- PC-024A through PC-024D
- PC-025A through PC-025H

Verify:

  grep -n \
    "FundamentalOperationsCenterScreen\|buildOperationalPriorities\|calculateOperationsScore\|classifyOperationsStatus\|Repository Readiness\|Filing Workflow\|Submission Operations\|Operations Navigation" \
    app/fundamental-operations-center.js
