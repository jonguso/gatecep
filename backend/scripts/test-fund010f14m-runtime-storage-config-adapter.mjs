import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

import {
  FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV,
  resolveRuntimeFundamentalDocumentStorageConfig
} from "../src/modules/fundamental-evidence/fundamentalDocumentStorageConfig.runtime.js";

console.log(
  "===== FUND-010F14M — RUNTIME STORAGE CONFIGURATION ADAPTER TEST ====="
);

assert.equal(
  FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV,
  "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT"
);

console.log(
  "PASS — canonical runtime configuration key is stable."
);

const developmentRoot =
  path.resolve(
    os.tmpdir(),
    "gatecep-f14m-development"
  );

const testRoot =
  path.resolve(
    os.tmpdir(),
    "gatecep-f14m-test"
  );

const productionFixtureRoot =
  path.resolve(
    os.tmpdir(),
    "gatecep-f14m-production-fixture"
  );

/*
 * Injected objects only.
 *
 * The test deliberately does not assign to process.env.
 */
const development =
  resolveRuntimeFundamentalDocumentStorageConfig({
    environment:
      "development",
    env: {
      FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
        developmentRoot
    }
  });

assert.equal(
  development.environment,
  "development"
);

assert.equal(
  development.storageRoot,
  developmentRoot
);

assert.equal(
  development.testStorage,
  false
);

console.log(
  "PASS — injected development runtime configuration resolved."
);

const test =
  resolveRuntimeFundamentalDocumentStorageConfig({
    environment:
      "test",
    env: {
      FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
        testRoot
    },
    allowTestStorage:
      true
  });

assert.equal(
  test.environment,
  "test"
);

assert.equal(
  test.storageRoot,
  testRoot
);

assert.equal(
  test.testStorage,
  true
);

console.log(
  "PASS — explicitly authorized injected test configuration resolved."
);

const productionFixture =
  resolveRuntimeFundamentalDocumentStorageConfig({
    environment:
      "production",
    env: {
      FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
        productionFixtureRoot
    }
  });

assert.equal(
  productionFixture.environment,
  "production"
);

assert.equal(
  productionFixture.storageRoot,
  productionFixtureRoot
);

assert.equal(
  productionFixture.testStorage,
  false
);

console.log(
  "PASS — injected production configuration contract resolved without activation."
);

assert.throws(
  () =>
    resolveRuntimeFundamentalDocumentStorageConfig({
      environment:
        "development",
      env: {}
    }),
  /storage root is required/
);

console.log(
  "PASS — missing runtime storage configuration fails closed."
);

assert.throws(
  () =>
    resolveRuntimeFundamentalDocumentStorageConfig({
      environment:
        "development",
      env: {
        FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
          "relative/fundamental-documents"
      }
    }),
  /must be an absolute path/
);

console.log(
  "PASS — relative runtime storage configuration fails closed."
);

assert.throws(
  () =>
    resolveRuntimeFundamentalDocumentStorageConfig({
      environment:
        "test",
      env: {
        FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
          testRoot
      }
    }),
  /Test document storage requires explicit authorization/
);

console.log(
  "PASS — runtime test storage still requires explicit authorization."
);

assert.throws(
  () =>
    resolveRuntimeFundamentalDocumentStorageConfig({
      environment:
        "development",
      env:
        null
    }),
  /runtime environment object is required/
);

console.log(
  "PASS — invalid injected runtime environment fails closed."
);

/*
 * Prove the adapter did not mutate the caller-owned object.
 */
const callerEnv = {
  FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
    developmentRoot,
  F14M_SENTINEL:
    "UNCHANGED"
};

const before =
  JSON.stringify(
    callerEnv
  );

resolveRuntimeFundamentalDocumentStorageConfig({
  environment:
    "development",
  env:
    callerEnv
});

const after =
  JSON.stringify(
    callerEnv
  );

assert.equal(
  after,
  before
);

assert.equal(
  callerEnv.F14M_SENTINEL,
  "UNCHANGED"
);

console.log(
  "PASS — injected runtime environment remains immutable."
);

console.log(
  JSON.stringify(
    {
      envKey:
        FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_ENV,

      development: {
        environment:
          development.environment,
        absolute:
          path.isAbsolute(
            development.storageRoot
          ),
        testStorage:
          development.testStorage
      },

      test: {
        environment:
          test.environment,
        absolute:
          path.isAbsolute(
            test.storageRoot
          ),
        testStorage:
          test.testStorage
      },

      productionContract: {
        environment:
          productionFixture.environment,
        absolute:
          path.isAbsolute(
            productionFixture.storageRoot
          ),
        testStorage:
          productionFixture.testStorage,
        activated:
          false
      }
    },
    null,
    2
  )
);

console.log(
  "F10F14M_PROCESS_ENV_MUTATION=NONE"
);
console.log(
  "F10F14M_ENV_FILE_MODIFICATION=NONE"
);
console.log(
  "F10F14M_DIRECTORY_CREATION=NONE"
);
console.log(
  "F10F14M_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14M_DOCUMENT_DOWNLOAD=NONE"
);
console.log(
  "F10F14M_PRODUCTION_STORAGE_ACTIVATION=NONE"
);
console.log(
  "F10F14M_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14M_PROVIDER_COST=ZERO"
);
console.log(
  "F10F14M_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14M_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14M_VERIFICATION=NONE"
);
console.log(
  "F10F14M_APPROVAL=NONE"
);
console.log(
  "F10F14M_PROMOTION=NONE"
);
console.log(
  "F10F14M_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14M PASS ====="
);
