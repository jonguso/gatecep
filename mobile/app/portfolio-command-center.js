import React from "react";
import { Redirect } from "expo-router";

/*
 * PC-030C1A
 *
 * Legacy compatibility route.
 *
 * Canonical portfolio:
 *   /portfolio-hub
 */
export default function PortfolioCommandCenterCompatibilityRoute() {
  return (
    <Redirect href="/portfolio-hub" />
  );
}
