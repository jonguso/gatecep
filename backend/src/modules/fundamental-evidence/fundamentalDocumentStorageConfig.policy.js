import path from "node:path";

function clean(value) {
  return String(value ?? "").trim();
}

function configError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}

function canonicalEnvironment(value) {
  const environment =
    clean(value)
      .toLowerCase();

  if (!environment) {
    throw configError(
      "FUNDAMENTAL_DOCUMENT_STORAGE_ENVIRONMENT_REQUIRED",
      "A runtime environment is required for document storage configuration."
    );
  }

  return environment;
}

function requireAbsoluteStorageRoot(value) {
  const storageRoot =
    clean(value);

  if (!storageRoot) {
    throw configError(
      "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_REQUIRED",
      "A document storage root is required."
    );
  }

  if (!path.isAbsolute(storageRoot)) {
    throw configError(
      "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_NOT_ABSOLUTE",
      "Document storage root must be an absolute path."
    );
  }

  return path.resolve(
    storageRoot
  );
}

/*
 * Pure storage configuration policy.
 *
 * This policy does NOT:
 * - read process.env,
 * - create directories,
 * - inspect the filesystem,
 * - write documents,
 * - retrieve documents,
 * - mutate the database,
 * - select a production path.
 *
 * Runtime configuration must be supplied explicitly.
 */
export function resolveFundamentalDocumentStorageConfig({
  environment,
  storageRoot,
  allowTestStorage = false
} = {}) {
  const canonicalRuntimeEnvironment =
    canonicalEnvironment(
      environment
    );

  const canonicalStorageRoot =
    requireAbsoluteStorageRoot(
      storageRoot
    );

  const isTestEnvironment =
    canonicalRuntimeEnvironment ===
      "test";

  /*
   * Test storage requires explicit opt-in.
   *
   * This prevents a caller from accidentally treating
   * disposable test storage as an ordinary configured
   * document repository.
   */
  if (
    isTestEnvironment &&
    allowTestStorage !== true
  ) {
    throw configError(
      "FUNDAMENTAL_DOCUMENT_TEST_STORAGE_NOT_ALLOWED",
      "Test document storage requires explicit authorization."
    );
  }

  /*
   * Production receives no implicit default and no
   * special bypass. The absolute root must have been
   * explicitly supplied by the caller.
   *
   * This policy intentionally does not decide what that
   * production path should be.
   */
  return {
    environment:
      canonicalRuntimeEnvironment,

    storageRoot:
      canonicalStorageRoot,

    testStorage:
      isTestEnvironment,

    explicitlyConfigured:
      true
  };
}

export default {
  resolveFundamentalDocumentStorageConfig
};
