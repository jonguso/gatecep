import assert from "node:assert/strict";
import path from "node:path";

import {
  FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV,
  resolveRuntimeFundamentalDocumentStorageConfig
} from "../src/modules/fundamental-evidence/fundamentalDocumentStorageConfig.runtime.js";

console.log(
  "===== FUND-010F14R — STORAGE DEPLOYMENT CONTRACT TEST ====="
);

assert.equal(
  FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV,
  "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT"
);

console.log(
  "PASS — canonical runtime environment key preserved."
);

assert.throws(
  () =>
    resolveRuntimeFundamentalDocumentStorageConfig({
      environment: "production",
      env: {}
    }),
  error =>
    error?.code ===
      "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_REQUIRED"
);

console.log(
  "PASS — production fails closed when storage root is absent."
);

assert.throws(
  () =>
    resolveRuntimeFundamentalDocumentStorageConfig({
      environment: "production",
      env: {
        FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
          "relative/fundamental-documents"
      }
    }),
  error =>
    error?.code ===
      "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_NOT_ABSOLUTE"
);

console.log(
  "PASS — relative production storage root rejected."
);

const configuredRoot =
  path.resolve(
    path.parse(process.cwd()).root,
    "gatecep-fundamental-documents-contract-test"
  );

const production =
  resolveRuntimeFundamentalDocumentStorageConfig({
    environment: "production",

    env: {
      FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
        configuredRoot
    }
  });

assert.equal(
  production.environment,
  "production"
);

assert.equal(
  production.storageRoot,
  configuredRoot
);

assert.equal(
  production.testStorage,
  false
);

assert.equal(
  production.explicitlyConfigured,
  true
);

console.log(
  "PASS — explicit absolute production configuration accepted without filesystem access."
);

assert.throws(
  () =>
    resolveRuntimeFundamentalDocumentStorageConfig({
      environment: "test",

      env: {
        FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
          configuredRoot
      }
    }),
  error =>
    error?.code ===
      "FUNDAMENTAL_DOCUMENT_TEST_STORAGE_NOT_ALLOWED"
);

console.log(
  "PASS — test storage requires explicit opt-in."
);

const testConfig =
  resolveRuntimeFundamentalDocumentStorageConfig({
    environment: "test",

    env: {
      FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
        configuredRoot
    },

    allowTestStorage: true
  });

assert.equal(
  testConfig.testStorage,
  true
);

console.log(
  "PASS — explicitly authorized test configuration accepted."
);

console.log(
  "F10F14R_FILESYSTEM_ACCESS=NONE"
);
console.log(
  "F10F14R_DIRECTORY_CREATION=NONE"
);
console.log(
  "F10F14R_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14R_PRODUCTION_STORAGE_ACTIVATION=NONE"
);
console.log(
  "F10F14R_ROUTE_REGISTRATION=NONE"
);
console.log(
  "F10F14R_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14R_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14R_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14R PASS ====="
);
