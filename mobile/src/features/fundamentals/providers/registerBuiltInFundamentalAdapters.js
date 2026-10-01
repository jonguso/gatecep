import {
  registerFundamentalImportAdapter
} from "../fundamentalImportService";

import {
  adaptGenericFundamentalProviderPayload
} from "./genericFundamentalProviderAdapter";

import {
  adaptApifyFundamentalPayload
} from "./apifyFundamentalProviderAdapter";

/*
 * Register built-in PC-024C provider adapters.
 */

let registered = false;

export function registerBuiltInFundamentalAdapters() {
  if (registered) {
    return [
      "GENERIC_PROVIDER",
      "APIFY_FUNDAMENTALS"
    ];
  }

  registerFundamentalImportAdapter({
    id:
      "GENERIC_PROVIDER",

    adapt:
      adaptGenericFundamentalProviderPayload
  });

  registerFundamentalImportAdapter({
    id:
      "APIFY_FUNDAMENTALS",

    adapt:
      adaptApifyFundamentalPayload
  });

  registered = true;

  return [
    "GENERIC_PROVIDER",
    "APIFY_FUNDAMENTALS"
  ];
}
