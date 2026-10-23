import {
  resolveFundamentalDocumentStorageConfig
} from "./fundamentalDocumentStorageConfig.policy.js";

export const
  FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV =
    "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT";

/*
 * Runtime adapter only.
 *
 * Responsibilities:
 * - read the configured document-storage root from the supplied
 *   runtime environment,
 * - pass that value into the F14L pure configuration policy,
 * - fail closed through F14L when configuration is absent,
 *   relative, or otherwise invalid.
 *
 * This adapter does NOT:
 * - create directories,
 * - inspect the filesystem,
 * - write documents,
 * - retrieve documents,
 * - invoke retention,
 * - mutate the database,
 * - verify/approve/promote/publish fundamentals,
 * - modify process.env,
 * - select a default production path.
 *
 * `env` is injectable so the runtime boundary can be tested without
 * mutating the real Node process environment.
 */
export function resolveRuntimeFundamentalDocumentStorageConfig({
  environment,
  env = process.env,
  allowTestStorage = false
} = {}) {
  if (
    !env ||
    typeof env !== "object"
  ) {
    const error =
      new Error(
        "A runtime environment object is required."
      );

    error.code =
      "FUNDAMENTAL_DOCUMENT_RUNTIME_ENV_REQUIRED";

    throw error;
  }

  return resolveFundamentalDocumentStorageConfig({
    environment,
    storageRoot:
      env[
        FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV
      ],
    allowTestStorage
  });
}

export default {
  FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV,
  resolveRuntimeFundamentalDocumentStorageConfig
};
