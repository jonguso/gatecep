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
  "===== FUND-010F14S — ADMIN RETENTION ROUTE REGISTRATION TEST ====="
);

assert.match(
  adminSource,
  /import\s+fundamentalDocumentRetentionAdminRoutes\s+from\s+["']\.\.\/fundamental-evidence\/fundamentalDocumentRetentionAdmin\.route\.js["']/
);

console.log(
  "PASS — Admin router imports canonical retention child router."
);

assert.match(
  adminSource,
  /router\.use\(\s*fundamentalDocumentRetentionAdminRoutes\s*\)/
);

console.log(
  "PASS — retention child router is mounted by Admin router."
);

assert.match(
  serverSource,
  /app\.use\(\s*["']\/admin["']\s*,\s*adminRoutes\s*\)/
);

console.log(
  "PASS — application preserves canonical /admin parent mount."
);

assert.match(
  retentionSource,
  /router\.post\(\s*["']\/fundamentals\/documents\/retain["']/
);

console.log(
  "PASS — child router preserves canonical retention path."
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
  "PASS — child route preserves authentication and ADMIN authorization."
);

assert.match(
  retentionSource,
  /MAX_DOCUMENT_BYTES\s*=\s*20\s*\*\s*1024\s*\*\s*1024/
);

console.log(
  "PASS — 20 MB upload boundary remains present."
);

assert.match(
  retentionSource,
  /resolveRuntimeFundamentalDocumentStorageConfig/
);

console.log(
  "PASS — storage remains runtime-configured rather than hardcoded."
);

assert.doesNotMatch(
  adminSource,
  /FUNDAMENTAL_DOCUMENT_STORAGE_ROOT\s*=/
);

assert.doesNotMatch(
  serverSource,
  /FUNDAMENTAL_DOCUMENT_STORAGE_ROOT\s*=/
);

console.log(
  "PASS — registration does not select or activate a storage root."
);

assert.doesNotMatch(
  adminSource,
  /mkdirSync|writeFileSync|writeFile\s*\(/
);

console.log(
  "PASS — registration adds no direct filesystem write."
);

console.log(
  JSON.stringify(
    {
      applicationMount:
        "/admin",

      childPath:
        "/fundamentals/documents/retain",

      canonicalPath:
        "/admin/fundamentals/documents/retain",

      method:
        "POST",

      productionStorageConfigured:
        false
    },
    null,
    2
  )
);

console.log(
  "F10F14S_SERVER_START=NONE"
);
console.log(
  "F10F14S_HTTP_REQUEST=NONE"
);
console.log(
  "F10F14S_DOCUMENT_WRITE=NONE"
);
console.log(
  "F10F14S_PRODUCTION_STORAGE_ACTIVATION=NONE"
);
console.log(
  "F10F14S_PROVIDER_CALL=NONE"
);
console.log(
  "F10F14S_DATABASE_MUTATION=NONE"
);
console.log(
  "F10F14S_FUNDAMENTAL_MUTATION=NONE"
);
console.log(
  "F10F14S_VERIFICATION=NONE"
);
console.log(
  "F10F14S_APPROVAL=NONE"
);
console.log(
  "F10F14S_PROMOTION=NONE"
);
console.log(
  "F10F14S_PUBLICATION=NONE"
);

console.log(
  "===== FUND-010F14S PASS ====="
);
