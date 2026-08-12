PC-027A — Corporate Action Data Model + Registry

Purpose:
Corporate actions are portfolio-impacting events, not merely news.

Files:
src/features/corporate-actions/corporateActionModel.js
src/features/corporate-actions/corporateActionRegistry.js
src/features/corporate-actions/index.js

Foundation supports dividends, rights, bonus issues, splits, consolidations,
capital distributions, mergers, delistings and suspensions.

Critical safeguard:
PC-027A never modifies holdings, cash, cost basis or broker balances.
Expected effects remain separate from broker-confirmed portfolio state.

Verify:
grep -n "CORPORATE_ACTION_TYPES\|CORPORATE_ACTION_STATUSES\|buildCorporateAction\|validateCorporateAction\|registerCorporateAction\|detectCorporateActionDuplicate\|loadUpcomingCorporateActions\|buildCorporateActionRegistrySummary" src/features/corporate-actions/*.js
