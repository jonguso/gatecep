import { Redirect } from "expo-router";

/**
 * Legacy compatibility route.
 * Performance has one canonical investor destination: /performance.
 */
export default function LegacyPortfolioPerformanceRedirect() {
  return <Redirect href="/performance" />;
}
