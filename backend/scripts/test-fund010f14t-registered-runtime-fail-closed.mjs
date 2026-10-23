import assert from "node:assert/strict";
import fs from "node:fs/promises";

const adminRoutePath =
  new URL(
    "../src/modules/admin/admin.routes.js",
    import.meta.url
  );

const retentionRoutePath =
  new URL(
    "../src/modules/fundamental-evidence/fundamentalDocumentRetentionAdmin.route.js",
    import.meta.url
  );

const serverPath =
  new URL(
    "../src/server.js",
    import.meta.url
  );

const [
  adminSource,
  retentionSource,
  serverSource
] =
  await Promise.all([
    fs.readFile(
      adminRoutePath,
      "utf8"
    ),

    fs.readFile(
      retentionRoutePath,
      "utf8"
    ),

    fs.readFile(
      serverPath,
      "utf8"
    )
  ]);

console.log(
  "===== FUND-010F14T — REGISTERED RUNTIME FAIL-CLOSED TEST ====="
);

/*
 * Registration chain:
 *
 * server.js
 *   /admin
 *      ->
 * admin.routes.js
 *      ->
 * fundamentalDocumentRetentionAdmin.route.js
 *      ->
 * /fundamentals/documents/retain
 */

assert.match(
  serverSource,
  /app\.use\(\s*["']\/admin["']\s*,\s*adminRoutes\s*\)/
);

console.log(
  "PASS — application mounts Admin router at /admin."
);

assert.match(
  adminSource,
  /import\s+fundamentalDocumentRetentionAdminRoutes\s+from\s+["']\.\.\/fundamental-evidence\/fundamentalDocumentRetentionAdmin\.route\.js["']/
);

assert.match(
  adminSource,
  /router\.use\(\s*fundamentalDocumentRetentionAdminRoutes\s*\)/
);

console.log(
  "PASS — Admin router mounts retention child router."
);

assert.match(
  retentionSource,
  /router\.post\(\s*["']\/fundamentals\/documents\/retain["']/
);

console.log(
  "PASS — canonical registered path resolves to POST /admin/fundamentals/documents/retain."
);

assert.match(
  retentionSource,
  /authRequired/
);

assert.match(
  retentionSource,
  /requireAdmin/
);

console.log(
  "PASS — registered route retains authentication and ADMIN authorization."
);

assert.match(
  retentionSource,
  /resolveRuntimeFundamentalDocumentStorageConfig/
);

console.log(
  "PASS — registered route resolves storage at request runtime."
);

/*
 * Verify no source-level storage fallback has appeared.
 */

assert.doesNotMatch(
  adminSource,
  /FUNDAMENTAL_DOCUMENT_STORAGE_ROOT\s*=/
);

assert.doesNotMatch(
  serverSource,
  /FUNDAMENTAL_DOCUMENT_STORAGE_ROOT\s*=/
);

assert.doesNotMatch(
  retentionSource,
  /FUNDAMENTAL_DOCUMENT_STORAGE_ROOT\s*=\s*["'][^"']+/
);

console.log(
  "PASS — registered source contains no hardcoded storage fallback."
);

/*
 * Import the runtime resolver directly and prove the exact
 * production request-time configuration still fails closed
 * when the canonical environment key is absent.
 */

const {
  resolveRuntimeFundamentalDocumentStorageConfig
} =
  await import(
    "../src/modules/fundamental-evidence/fundamentalDocumentStorageConfig.runtime.js"
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
  "PASS — registered production storage dependency fails closed when unconfigured."
);

/*
 * The test deliberately does NOT invoke the retention endpoint
 * with a valid PDF because that would require authorization and
 * filesystem retention. F14P already proves the full multipart
 * execution path using OS-temp storage.
 */

console.log(
  JSON.stringify(
    {
      canonicalRoute:
        "/admin/fundamentals/documents/retain",

      method:
        "POST",

      sourceRegistered:
        true,

      productionStorageConfigured:
        false,

      productionRequestOutcome:
        "FAIL_CLOSED_AT_STORAGE_CONFIGURATION"
    },
    null,
    2
  )
);

console.log(
  "F10F14T_SERVER_START=NONE"
);
console.log(
  "F10F14T_HTTP_REQUEST=NONE"
);
console.log(
  "F10F14T_REAL_ENV_MUTATION=NONE"
);
console.log(
  "F10F14T_DIRECTORY_CREATION=NONE"
);
console.log(
  "F10F14T_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14T_PRODUCTION_STORAGE_ACTIVATION=NONE"
);
console.log(
  "F10F14T_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14T_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14T_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14T_VERIFICATION=NONE"
);
console.log(
  "F10F14T_APPROVAL=NONE"
);
console.log(
  "F10F14T_PROMOTION=NONE"
);
console.log(
  "F10F14T_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14T PASS ====="
);
