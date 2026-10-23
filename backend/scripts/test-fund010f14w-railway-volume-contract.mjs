import assert from "node:assert/strict";
import path from "node:path";

import {
  resolveRuntimeFundamentalDocumentStorageConfig
} from "../src/modules/fundamental-evidence/fundamentalDocumentStorageConfig.runtime.js";

console.log(
  "===== FUND-010F14W — RAILWAY VOLUME CONTRACT TEST ====="
);

/*
 * Proposed infrastructure contract only.
 *
 * Nothing in this test creates or attaches a Railway volume.
 * Nothing modifies Railway variables.
 *
 * If separately approved later, Railway would mount a persistent
 * volume at this absolute location and the backend runtime variable
 * would point to the same location.
 */
/*
 * Railway infrastructure boundary:
 *
 *   volume mount:
 *     /data
 *
 * GateCEP F14 application storage root:
 *     /data/fundamental-documents
 *
 * The broader /data mount allows the backend to use the same
 * persistent volume for future durable application data while
 * keeping F14 documents isolated beneath their own root.
 */
const proposedRailwayVolumeMount =
  "/data";

const proposedRailwayMount =
  "/data/fundamental-documents";

assert.equal(
  path.isAbsolute(proposedRailwayMount),
  true
);

console.log(
  "PASS — proposed Railway mount is an absolute path."
);

const config =
  resolveRuntimeFundamentalDocumentStorageConfig({
    environment: "production",

    env: {
      FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
        proposedRailwayMount
    }
  });

assert.equal(
  config.environment,
  "production"
);

/*
 * The canonical storage policy intentionally uses the host
 * platform's path.resolve().
 *
 * This verifier runs on the developer workstation, which may
 * be Windows, while the proposed Railway runtime is Linux.
 *
 * Therefore do not require the Windows-resolved test value to
 * equal the literal Linux mount string. Instead verify that:
 *
 * 1. the runtime adapter accepted an explicitly configured
 *    absolute production root, and
 * 2. the resolved value is exactly what this host platform
 *    considers canonical for the proposed mount.
 *
 * Railway activation remains a separate infrastructure action.
 */
assert.equal(
  config.storageRoot,
  path.resolve(
    proposedRailwayMount
  )
);

assert.equal(
  config.testStorage,
  false
);

assert.equal(
  config.explicitlyConfigured,
  true
);

console.log(
  "PASS — proposed Railway mount satisfies canonical F14 production configuration."
);

for (
  const unsafeRoot of [
    "data/fundamental-documents",
    "./data/fundamental-documents",
    "backend/data/fundamental-documents"
  ]
) {
  assert.throws(
    () =>
      resolveRuntimeFundamentalDocumentStorageConfig({
        environment: "production",

        env: {
          FUNDAMENTAL_DOCUMENT_STORAGE_ROOT:
            unsafeRoot
        }
      }),
    error =>
      error?.code ===
        "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT_NOT_ABSOLUTE"
  );
}

console.log(
  "PASS — repository-relative storage paths remain rejected."
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
  "PASS — absent Railway storage configuration remains fail-closed."
);

console.log(
  JSON.stringify(
    {
      infrastructure:
        "RAILWAY",

      proposedVolumeMount:
        proposedRailwayMount,

      proposedRuntimeVariable:
        {
          name:
            "FUNDAMENTAL_DOCUMENT_STORAGE_ROOT",

          value:
            proposedRailwayMount
        },

      volumeRequired:
        true,

      volumeCreated:
        false,

      volumeAttached:
        false,

      railwayVariableChanged:
        false,

      deploymentPerformed:
        false
    },
    null,
    2
  )
);

console.log(
  "F10F14W_RAILWAY_ACCESS=NONE"
);
console.log(
  "F10F14W_RAILWAY_VOLUME_CREATE=NONE"
);
console.log(
  "F10F14W_RAILWAY_VOLUME_ATTACH=NONE"
);
console.log(
  "F10F14W_RAILWAY_VARIABLE_CHANGE=NONE"
);
console.log(
  "F10F14W_DEPLOYMENT=NONE"
);
console.log(
  "F10F14W_DIRECTORY_CREATION=NONE"
);
console.log(
  "F10F14W_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14W_PRODUCTION_STORAGE_ACTIVATION=NONE"
);
console.log(
  "F10F14W_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14W_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14W_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14W PASS ====="
);
