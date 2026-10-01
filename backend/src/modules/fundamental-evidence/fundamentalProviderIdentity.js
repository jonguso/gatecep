/*
 * PC-032G4B1C8G3D6F4E2
 *
 * Fundamental-provider security identity boundary.
 *
 * This service does not retrieve evidence and does not
 * mutate fundamentals, portfolios, cash, orders, or trades.
 *
 * GateCEP canonical security identity remains authoritative.
 * Provider-specific identity must be explicitly established;
 * it is never guessed from an exchange suffix.
 */

import {
  getSecurityBySymbol
} from "../../data/nseSecurityMaster.js";

const clean = (value) =>
  String(value ?? "").trim().toUpperCase();

export function resolveFundamentalProviderIdentity(
  symbol
) {
  const requested =
    clean(symbol);

  if (!requested) {
    throw new Error(
      "A valid NSE security symbol is required."
    );
  }

  const security =
    getSecurityBySymbol(requested);

  const canonicalSymbol =
    clean(security?.symbol);

  if (!canonicalSymbol) {
    throw new Error(
      "The NSE security could not be resolved."
    );
  }

  /*
   * No Yahoo/provider ticker is inferred here.
   *
   * D6F4E establishes the server-side authority boundary.
   * A provider symbol becomes available only after that
   * provider identity has been explicitly qualified.
   */
  return {
    canonicalSymbol,
    providerSymbol: null,
    providerIdentityStatus:
      "UNQUALIFIED"
  };
}

export default {
  resolveFundamentalProviderIdentity
};
