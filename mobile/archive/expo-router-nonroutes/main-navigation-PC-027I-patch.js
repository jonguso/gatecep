/*
 * PC-027I — MAIN NAVIGATION INTEGRATION
 *
 * Corporate Actions should be reachable, but it should NOT become a
 * primary bottom-navigation tab.
 *
 * Recommended:
 * - Home: contextual card only when relevant
 * - Portfolio: Corporate Actions summary card
 * - Coach G: contextual prompt
 * - More / Wealth tools / secondary menu: permanent route
 *
 * Permanent route:
 *
 * router.push("/corporate-actions")
 *
 * Example secondary-menu item:
 *
 * {
 *   id: "CORPORATE_ACTIONS",
 *   title: "Corporate Actions",
 *   description: "Dividends, rights, share changes and decisions affecting you",
 *   route: "/corporate-actions"
 * }
 */

export const PC_027I_NAVIGATION_PATCH = true;
