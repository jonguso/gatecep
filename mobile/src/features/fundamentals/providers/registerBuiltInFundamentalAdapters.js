import {
  registerFundamentalImportAdapter
} from "../fundamentalImportService";

import {
  adaptGenericFundamentalProviderPayload
} from "./genericFundamentalProviderAdapter";

/*
 * Register built-in PC-024C provider adapters.
 */

let registered = false;

export function registerBuiltInFundamentalAdapters() {
  if (registered) {
    return [
      "GENERIC_PROVIDER"
    ];
  }

  registerFundamentalImportAdapter({
    id:
      "GENERIC_PROVIDER",

    adapt:
      adaptGenericFundamentalProviderPayload
  });

  registered = true;

  return [
    "GENERIC_PROVIDER"
  ];
}
