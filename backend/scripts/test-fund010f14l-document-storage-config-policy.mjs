import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

import {
  resolveFundamentalDocumentStorageConfig
} from "../src/modules/fundamental-evidence/fundamentalDocumentStorageConfig.policy.js";

console.log(
  "===== FUND-010F14L — DOCUMENT STORAGE CONFIGURATION POLICY TEST ====="
);

/*
 * Use absolute fixture paths only.
 *
 * Nothing is created at these locations.
 */
const developmentRoot =
  path.resolve(
    os.tmpdir(),
    "gatecep-f14l-development"
  );

const testRoot =
  path.resolve(
    os.tmpdir(),
    "gatecep-f14l-test"
  );

const productionFixtureRoot =
  path.resolve(
    os.tmpdir(),
    "gatecep-f14l-production-fixture"
  );

const development =
  resolveFundamentalDocumentStorageConfig({
    environment:
      "development",
    storageRoot:
      developmentRoot
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

assert.equal(
  development.explicitlyConfigured,
  true
);

console.log(
  "PASS — explicit development storage configuration accepted."
);

const test =
  resolveFundamentalDocumentStorageConfig({
    environment:
      "test",
    storageRoot:
      testRoot,
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
  "PASS — explicitly authorized test storage accepted."
);

const productionFixture =
  resolveFundamentalDocumentStorageConfig({
    environment:
      "production",
    storageRoot:
      productionFixtureRoot
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
  "PASS — explicitly supplied absolute production configuration contract accepted."
);

assert.throws(
  () =>
    resolveFundamentalDocumentStorageConfig({
      environment:
        "development"
    }),
  /storage root is required/
);

console.log(
  "PASS — missing storage root fails closed."
);

assert.throws(
  () =>
    resolveFundamentalDocumentStorageConfig({
      storageRoot:
        developmentRoot
    }),
  /runtime environment is required/
);

console.log(
  "PASS — missing runtime environment fails closed."
);

assert.throws(
  () =>
    resolveFundamentalDocumentStorageConfig({
      environment:
        "development",
      storageRoot:
        "./fundamental-documents"
    }),
  /must be an absolute path/
);

console.log(
  "PASS — relative storage root rejected."
);

assert.throws(
  () =>
    resolveFundamentalDocumentStorageConfig({
      environment:
        "test",
      storageRoot:
        testRoot
    }),
  /Test document storage requires explicit authorization/
);

console.log(
  "PASS — test storage without explicit opt-in rejected."
);

/*
 * Verify normalization without filesystem access.
 */
const normalized =
  resolveFundamentalDocumentStorageConfig({
    environment:
      "  DEVELOPMENT  ",
    storageRoot:
      developmentRoot
  });

assert.equal(
  normalized.environment,
  "development"
);

assert.equal(
  normalized.storageRoot,
  developmentRoot
);

console.log(
  "PASS — runtime environment normalization is deterministic."
);

console.log(
  JSON.stringify(
    {
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
          productionFixture.testStorage
      }
    },
    null,
    2
  )
);

console.log(
  "F10F14L_ENV_READ=NONE"
);
console.log(
  "F10F14L_ENV_MODIFICATION=NONE"
);
console.log(
  "F10F14L_DIRECTORY_CREATION=NONE"
);
console.log(
  "F10F14L_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14L_DOCUMENT_DOWNLOAD=NONE"
);
console.log(
  "F10F14L_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14L_PROVIDER_COST=ZERO"
);
console.log(
  "F10F14L_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14L_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14L_VERIFICATION=NONE"
);
console.log(
  "F10F14L_APPROVAL=NONE"
);
console.log(
  "F10F14L_PROMOTION=NONE"
);
console.log(
  "F10F14L_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14L PASS ====="
);
