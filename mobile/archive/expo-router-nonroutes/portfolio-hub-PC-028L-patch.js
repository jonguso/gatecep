/*
 * PC-028L — PORTFOLIO HUB SOURCE POLICY PATCH GUIDE
 *
 * Selector:
 *
 * All Accounts
 * Broker A
 * Broker B
 * Imported Portfolio
 * Practice Portfolio
 *
 * ALL = all REAL sources combined.
 * Practice is NEVER included in ALL.
 *
 * Default:
 *   Real source exists -> ALL
 *   No real source -> PRACTICE
 *
 * Selecting a source changes only the portfolio view.
 * It never creates or modifies Investor DNA.
 */

export const PC_028L_PORTFOLIO_HUB_PATCH = true;
