/*
 * ============================================================
 * PC-026D
 * FUNDAMENTAL FEATURE NAVIGATION REGISTRY
 * ============================================================
 *
 * Central route registry for the fundamental-data workflow.
 * Add new routes here instead of hard-coding navigation links
 * across multiple screens.
 * ============================================================
 */

export const FUNDAMENTAL_HOME_ROUTE =
  "/fundamental-data-hub";

export const FUNDAMENTAL_NAVIGATION_GROUPS = [
  {
    id:
      "OVERVIEW",

    title:
      "Overview and Operations",

    description:
      "Monitor the complete fundamental-data workflow.",

    items: [
      {
        id:
          "OPERATIONS_CENTER",

        title:
          "Fundamental Operations Center",

        description:
          "Repository quality, filing queues, duplicate alerts, submissions, and operational priorities.",

        route:
          "/fundamental-operations-center",

        phase:
          "PC-026A"
      },

      {
        id:
          "SUBMISSION_HISTORY",

        title:
          "Filing Submission History",

        description:
          "Review receipts, retry failures, resolve duplicate blocks, and open linked filings.",

        route:
          "/filing-submission-history",

        phase:
          "PC-025H"
      }
    ]
  },

  {
    id:
      "DATA_INTAKE",

    title:
      "Data Intake and Preparation",

    description:
      "Import or prepare verified company fundamentals.",

    items: [
      {
        id:
          "FUNDAMENTAL_IMPORT",

        title:
          "Fundamental Import",

        description:
          "Import verified CSV, normalized JSON, or provider data.",

        route:
          "/fundamental-import",

        phase:
          "PC-024D"
      },

      {
        id:
          "SINGLE_PERIOD_EXTRACTION",

        title:
          "Single-Period Filing Extraction",

        description:
          "Enter one annual filing, attach source references, validate, and generate filing-ready JSON.",

        route:
          "/filing-extraction",

        phase:
          "PC-025D / PC-025G"
      },

      {
        id:
          "MULTI_PERIOD_EXTRACTION",

        title:
          "Multi-Period Filing Extraction",

        description:
          "Compare several fiscal years, validate trends, and generate one combined filing.",

        route:
          "/multi-period-filing-extraction",

        phase:
          "PC-025E / PC-025G"
      }
    ]
  },

  {
    id:
      "FILING_CONTROL",

    title:
      "Filing Review and Control",

    description:
      "Submit, review, approve, revise, and promote verified filings.",

    items: [
      {
        id:
          "FILING_IMPORT_BRIDGE",

        title:
          "Filing Import Bridge",

        description:
          "Preview and submit filing-ready JSON into the verified-filing repository.",

        route:
          "/filing-import-bridge",

        phase:
          "PC-025F"
      },

      {
        id:
          "VERIFIED_FILING_REVIEW",

        title:
          "Verified Filing Review",

        description:
          "Verify, approve, reject, revise, and promote controlled filing records.",

        route:
          "/verified-filings",

        phase:
          "PC-025C / PC-025G"
      }
    ]
  },

  {
    id:
      "RESEARCH",

    title:
      "Research and Valuation",

    description:
      "Use approved fundamentals for valuation and investment research.",

    items: [
      {
        id:
          "RESEARCH_VALUATION",

        title:
          "Research and Valuation",

        description:
          "Fair value, relative valuation, forecasts, confidence analysis, and investment theses.",

        route:
          "/research-valuation",

        phase:
          "PC-023B"
      }
    ]
  }
];

export function loadFundamentalNavigationItems() {
  return FUNDAMENTAL_NAVIGATION_GROUPS
    .flatMap(
      (group) =>
        group.items.map(
          (item) => ({
            ...item,

            groupId:
              group.id,

            groupTitle:
              group.title
          })
        )
    );
}

export function findFundamentalNavigationItem(
  route
) {
  return loadFundamentalNavigationItems()
    .find(
      (item) =>
        item.route ===
        route
    ) ||
    null;
}
