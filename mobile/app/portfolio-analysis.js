import React from "react";
import { Redirect } from "expo-router";

/*
 * PC-030C1A
 *
 * Legacy compatibility route.
 *
 * Canonical Coach G:
 *   /(tabs)/coach
 */
export default function PortfolioAnalysisCompatibilityRoute() {
  return (
    <Redirect href="/(tabs)/coach" />
  );
}
