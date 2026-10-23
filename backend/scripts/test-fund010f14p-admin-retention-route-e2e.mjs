import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

console.log(
  "===== FUND-010F14P — ISOLATED ADMIN RETENTION ROUTE E2E ====="
);

const repoRoot =
  path.resolve(
    process.cwd()
  );

const backendRoot =
  path.join(
    repoRoot,
    "backend"
  );

const tempRoot =
  await fs.mkdtemp(
    path.join(
      os.tmpdir(),
      "gatecep-f14p-"
    )
  );

const isolatedBackend =
  path.join(
    tempRoot,
    "backend"
  );

const isolatedSrc =
  path.join(
    isolatedBackend,
    "src"
  );

const storageRoot =
  path.join(
    tempRoot,
    "document-storage"
  );

let server = null;

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

/*
 * Build a minimal but structurally valid PDF.
 *
 * No external PDF library is required. The generated document
 * contains a single page with Helvetica text and a valid xref
 * table/trailer so the real PDF parser can inspect it.
 */
function buildValidPdf(
  pageLines,
  pageCount = 246
) {
  if (
    !Number.isInteger(pageCount) ||
    pageCount < 1
  ) {
    throw new Error(
      "PDF fixture pageCount must be a positive integer."
    );
  }

  /*
   * Backward-compatible input:
   *
   * Array input places the supplied lines on page 1.
   *
   * Object input allows the banking fixture to place
   * evidence on its exact contractual PDF pages.
   */
  const linesByPage =
    Array.isArray(pageLines)
      ? {
          1: pageLines
        }
      : (
          pageLines &&
          typeof pageLines === "object"
            ? pageLines
            : {}
        );

  const escapePdfText =
    value =>
      String(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

  const buildPageStream =
    lines => {
      const commands = [
        "BT",
        "/F1 10 Tf",
        "40 760 Td"
      ];

      (lines || []).forEach(
        (line, index) => {
          if (index > 0) {
            commands.push(
              "0 -16 Td"
            );
          }

          commands.push(
            "(" +
            escapePdfText(line) +
            ") Tj"
          );
        }
      );

      commands.push("ET");

      return (
        commands.join("\n") +
        "\n"
      );
    };

  /*
   * Object layout:
   *
   * 1 = Catalog
   * 2 = Pages
   * 3..(pageCount + 2) = Page objects
   * next pageCount objects = page-specific streams
   * final object = Helvetica font
   *
   * Page-specific streams are required because the banking
   * extractor intentionally binds evidence to exact pages.
   */
  const firstPageObject = 3;

  const firstContentObject =
    firstPageObject +
    pageCount;

  const fontObject =
    firstContentObject +
    pageCount;

  const objectCount =
    fontObject;

  const objects =
    new Array(
      objectCount + 1
    );

  const kids = [];

  for (
    let pageNumber = 1;
    pageNumber <= pageCount;
    pageNumber += 1
  ) {
    const pageObject =
      firstPageObject +
      pageNumber -
      1;

    const contentObject =
      firstContentObject +
      pageNumber -
      1;

    kids.push(
      String(pageObject) +
      " 0 R"
    );

    objects[pageObject] =
      [
        "<< /Type /Page",
        "/Parent 2 0 R",
        "/MediaBox [0 0 612 792]",
        "/Resources << /Font << /F1 " +
          String(fontObject) +
          " 0 R >> >>",
        "/Contents " +
          String(contentObject) +
          " 0 R",
        ">>"
      ].join(" ");

    const stream =
      buildPageStream(
        linesByPage[
          pageNumber
        ] || []
      );

    objects[contentObject] =
      "<< /Length " +
      String(
        Buffer.byteLength(
          stream,
          "utf8"
        )
      ) +
      " >>\nstream\n" +
      stream +
      "endstream";
  }

  objects[1] =
    "<< /Type /Catalog /Pages 2 0 R >>";

  objects[2] =
    [
      "<< /Type /Pages",
      "/Kids [" +
        kids.join(" ") +
        "]",
      "/Count " +
        String(pageCount),
      ">>"
    ].join(" ");

  objects[fontObject] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf =
    "%PDF-1.4\n";

  const offsets =
    new Array(
      objectCount + 1
    ).fill(0);

  for (
    let objectNumber = 1;
    objectNumber <= objectCount;
    objectNumber += 1
  ) {
    offsets[objectNumber] =
      Buffer.byteLength(
        pdf,
        "utf8"
      );

    pdf +=
      String(objectNumber) +
      " 0 obj\n" +
      objects[objectNumber] +
      "\nendobj\n";
  }

  const xrefOffset =
    Buffer.byteLength(
      pdf,
      "utf8"
    );

  pdf +=
    "xref\n" +
    "0 " +
    String(objectCount + 1) +
    "\n";

  pdf +=
    "0000000000 65535 f \n";

  for (
    let objectNumber = 1;
    objectNumber <= objectCount;
    objectNumber += 1
  ) {
    pdf +=
      String(
        offsets[objectNumber]
      )
        .padStart(
          10,
          "0"
        ) +
      " 00000 n \n";
  }

  pdf +=
    "trailer\n" +
    "<< /Size " +
    String(objectCount + 1) +
    " /Root 1 0 R >>\n" +
    "startxref\n" +
    String(xrefOffset) +
    "\n%%EOF\n";

  return Buffer.from(
    pdf,
    "utf8"
  );
}

async function copyDirectory(
  source,
  destination
) {
  await fs.mkdir(
    destination,
    {
      recursive: true
    }
  );

  const entries =
    await fs.readdir(
      source,
      {
        withFileTypes: true
      }
    );

  for (const entry of entries) {
    const sourcePath =
      path.join(
        source,
        entry.name
      );

    const destinationPath =
      path.join(
        destination,
        entry.name
      );

    if (entry.isDirectory()) {
      await copyDirectory(
        sourcePath,
        destinationPath
      );

      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(
        sourcePath,
        destinationPath
      );
    }
  }
}

async function pathExists(
  target
) {
  try {
    await fs.stat(target);
    return true;
  } catch (error) {
    if (
      error?.code ===
        "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

async function listFiles(
  directory
) {
  if (
    !(await pathExists(directory))
  ) {
    return [];
  }

  const files = [];

  async function walk(current) {
    const entries =
      await fs.readdir(
        current,
        {
          withFileTypes: true
        }
      );

    for (const entry of entries) {
      const full =
        path.join(
          current,
          entry.name
        );

      if (entry.isDirectory()) {
        await walk(full);
      } else if (
        entry.isFile()
      ) {
        files.push(
          path.relative(
            directory,
            full
          ).replace(
            /\\/g,
            "/"
          )
        );
      }
    }
  }

  await walk(directory);

  return files.sort();
}

async function storageSnapshot() {
  const files =
    await listFiles(
      storageRoot
    );

  const result = [];

  for (const relativePath of files) {
    const absolutePath =
      path.join(
        storageRoot,
        relativePath
      );

    const buffer =
      await fs.readFile(
        absolutePath
      );

    result.push({
      relativePath,
      sizeBytes:
        buffer.length,
      hash:
        sha256(buffer)
    });
  }

  return result;
}

function assertStorageUnchanged(
  before,
  after,
  label
) {
  assert.deepEqual(
    after,
    before,
    label
  );
}

async function postMultipart({
  baseUrl,
  fields = {},
  fileBuffer,
  fileName =
    "KCB_2025_ANNUAL_REPORT.pdf",
  fileType =
    "application/pdf",
  role =
    "ADMIN",
  actorId =
    "admin-f14p-test"
}) {
  const form =
    new FormData();

  for (
    const [
      key,
      value
    ] of Object.entries(
      fields
    )
  ) {
    if (
      value !== undefined
    ) {
      form.append(
        key,
        typeof value === "boolean"
          ? String(value)
          : String(value)
      );
    }
  }

  if (fileBuffer !== undefined) {
    form.append(
      "file",
      new Blob(
        [fileBuffer],
        {
          type:
            fileType
        }
      ),
      fileName
    );
  }

  const response =
    await fetch(
      baseUrl +
        "/admin/fundamentals/documents/retain",
      {
        method:
          "POST",

        headers: {
          "x-f14p-user-id":
            actorId,

          "x-f14p-role":
            role
        },

        body:
          form
      }
    );

  let payload = null;

  try {
    payload =
      await response.json();
  } catch {
    payload = null;
  }

  return {
    status:
      response.status,
    payload
  };
}

try {
  /*
   * Copy only backend/src into an OS-temp isolated module tree.
   *
   * Production source remains untouched.
   */
  await copyDirectory(
    path.join(
      backendRoot,
      "src"
    ),
    isolatedSrc
  );

  /*
   * Make the isolated tree resolve the repository's installed
   * backend dependencies without copying node_modules.
   */
  const isolatedNodeModules =
    path.join(
      isolatedBackend,
      "node_modules"
    );

  const realNodeModules =
    path.join(
      backendRoot,
      "node_modules"
    );

  try {
    await fs.symlink(
      realNodeModules,
      isolatedNodeModules,
      process.platform === "win32"
        ? "junction"
        : "dir"
    );
  } catch (error) {
    throw new Error(
      "Unable to create isolated node_modules link: " +
      error.message
    );
  }

  /*
   * Preserve ESM behavior in the isolated backend.
   */
  await fs.writeFile(
    path.join(
      isolatedBackend,
      "package.json"
    ),
    JSON.stringify(
      {
        type:
          "module"
      },
      null,
      2
    ),
    "utf8"
  );

  /*
   * Replace authentication middleware ONLY inside the
   * isolated OS-temp copy.
   *
   * The test actor is derived from test-only headers.
   */
  const authStubPath =
    path.join(
      isolatedSrc,
      "middleware",
      "authRequired.js"
    );

  await fs.writeFile(
    authStubPath,
`export async function authRequired(req, res, next) {
  const id =
    String(
      req.headers["x-f14p-user-id"] || ""
    ).trim();

  const role =
    String(
      req.headers["x-f14p-role"] || ""
    ).trim().toUpperCase();

  if (!id) {
    return res.status(401).json({
      ok: false,
      error: "AUTH_REQUIRED"
    });
  }

  req.user = {
    id,
    role
  };

  return next();
}

export default {
  authRequired
};
`,
    "utf8"
  );

  const requireRoleStubPath =
    path.join(
      isolatedSrc,
      "middleware",
      "requireRole.js"
    );

  await fs.writeFile(
    requireRoleStubPath,
`export function requireRole(...allowedRoles) {
  const allowed =
    new Set(
      allowedRoles.map(
        value =>
          String(value || "")
            .trim()
            .toUpperCase()
      )
    );

  return function isolatedRequireRole(
    req,
    res,
    next
  ) {
    const role =
      String(
        req.user?.role || ""
      )
        .trim()
        .toUpperCase();

    if (!allowed.has(role)) {
      return res.status(403).json({
        ok: false,
        error: "FORBIDDEN"
      });
    }

    return next();
  };
}

export const requireAdmin =
  requireRole("ADMIN");

export default {
  requireRole,
  requireAdmin
};
`,
    "utf8"
  );

  /*
   * IMPORTANT:
   * F14O's route resolves F14M normally.
   *
   * The child/test process environment receives only an
   * OS-temp absolute storage root. No .env file is changed.
   */
  process.env.FUNDAMENTAL_DOCUMENT_STORAGE_ROOT =
    storageRoot;

  /*
   * The existing runtime adapter requires an environment
   * supplied by its caller. F14O currently invokes it
   * without an explicit environment, so the isolated
   * harness wraps only the temp-copy runtime adapter to
   * supply NODE_ENV/test.
   *
   * This is intentionally a verifier calibration layer,
   * not a production source modification.
   */
  const runtimeAdapterPath =
    path.join(
      isolatedSrc,
      "modules",
      "fundamental-evidence",
      "fundamentalDocumentStorageConfig.runtime.js"
    );

  const runtimeSource =
    await fs.readFile(
      runtimeAdapterPath,
      "utf8"
    );

  const calibratedRuntimeSource =
    runtimeSource.replace(
      /export function resolveRuntimeFundamentalDocumentStorageConfig\(\{\s*environment,\s*env = process\.env,\s*allowTestStorage = false\s*\} = \{\}\) \{/m,
`export function resolveRuntimeFundamentalDocumentStorageConfig({
  environment =
    process.env.NODE_ENV ||
    "test",
  env = process.env,
  allowTestStorage =
    true
} = {}) {`
    );

  if (
    calibratedRuntimeSource ===
      runtimeSource
  ) {
    throw new Error(
      "F14P could not calibrate the isolated F14M runtime adapter."
    );
  }

  await fs.writeFile(
    runtimeAdapterPath,
    calibratedRuntimeSource,
    "utf8"
  );

  /*
   * Import Express from the real backend dependency tree.
   */
  const expressModule =
    await import(
      pathToFileURL(
        path.join(
          realNodeModules,
          "express",
          "index.js"
        )
      ).href
    );

  const express =
    expressModule.default;

  const routeModule =
    await import(
      pathToFileURL(
        path.join(
          isolatedSrc,
          "modules",
          "fundamental-evidence",
          "fundamentalDocumentRetentionAdmin.route.js"
        )
      ).href +
        "?f14p=" +
        Date.now()
    );

  const app =
    express();

  app.use(
    "/admin",
    routeModule.default
  );

  server =
    await new Promise(
      (resolve, reject) => {
        const instance =
          app.listen(
            0,
            "127.0.0.1",
            () =>
              resolve(instance)
          );

        instance.on(
          "error",
          reject
        );
      }
    );

  const address =
    server.address();

  const baseUrl =
    "http://127.0.0.1:" +
    address.port;

  console.log(
    "PASS — isolated Express harness started."
  );

  /*
   * Use the same minimal PDF fixture style already accepted
   * by the F14 identity/extraction test family.
   */
  const validPdf =
    buildValidPdf(
      {
        1: [
          "KCB GROUP PLC",
          "ANNUAL REPORT AND FINANCIAL STATEMENTS 2025",
          "For the year ended 31 December 2025"
        ],

        141: [
          "CONSOLIDATED STATEMENT OF PROFIT OR LOSS",
          "Profit for the year 100000 90000",
          "- Owners of the parent company 95000 85000",
          "Earnings per share (basic and diluted) (Shs) 29.56 26.45"
        ],

        144: [
          "CONSOLIDATED STATEMENT OF FINANCIAL POSITION",
          "Total assets 1000000 900000",
          "Total liabilities 600000 550000",
          "Total equity 400000 350000",
          "Equity attributable to owners of the Company 380000 330000"
        ],

        149: [
          "CONSOLIDATED STATEMENT OF CASH FLOWS",
          "Net cash flows from operating activities 120000 110000",
          "Cash and cash equivalents at end of year 200000 180000"
        ],

        246: [
          "31 SHARE CAPITAL AND RESERVES",
          "Issued and fully paid - 3,213,462,815 (2024:",
          "3,213,462,815) ordinary shares of Shs 0.5 each"
        ]
      },
      246
    );

  /*
   * First prove authorization happens before any write.
   */
  const beforeNonAdmin =
    await storageSnapshot();

  const nonAdmin =
    await postMultipart({
      baseUrl,

      role:
        "INVESTOR",

      fields: {
        symbol:
          "KCB",

        source:
          "CMA",

        confirmed:
          true,

        reason:
          "F14P non-admin rejection."
      },

      fileBuffer:
        validPdf
    });

  assert.equal(
    nonAdmin.status,
    403
  );

  assertStorageUnchanged(
    beforeNonAdmin,
    await storageSnapshot(),
    "Non-admin request mutated storage."
  );

  console.log(
    "PASS — non-admin rejected before filesystem mutation."
  );

  /*
   * Browser-forged evidence fields must be rejected.
   */
  const beforeForged =
    await storageSnapshot();

  const forged =
    await postMultipart({
      baseUrl,

      fields: {
        symbol:
          "KCB",

        source:
          "CMA",

        confirmed:
          true,

        reason:
          "F14P forged evidence rejection.",

        identity:
          JSON.stringify({
            identityStatus:
              "IDENTIFIED"
          })
      },

      fileBuffer:
        validPdf
    });

  assert.equal(
    forged.status,
    400
  );

  assert.equal(
    forged.payload?.error,
    "FUNDAMENTAL_DOCUMENT_RETENTION_REQUEST_INVALID"
  );

  assertStorageUnchanged(
    beforeForged,
    await storageSnapshot(),
    "Forged evidence request mutated storage."
  );

  console.log(
    "PASS — browser-forged evidence rejected before retention."
  );

  /*
   * Missing explicit confirmation reaches F14J and must
   * fail before F14E can write.
   */
  const beforeUnconfirmed =
    await storageSnapshot();

  const unconfirmed =
    await postMultipart({
      baseUrl,

      fields: {
        symbol:
          "KCB",

        source:
          "CMA",

        reason:
          "F14P confirmation guard."
      },

      fileBuffer:
        validPdf
    });

  assert.equal(
    unconfirmed.status,
    422
  );

  assert.equal(
    unconfirmed.payload?.error,
    "FUNDAMENTAL_DOCUMENT_RETENTION_CONFIRMATION_REQUIRED"
  );

  assertStorageUnchanged(
    beforeUnconfirmed,
    await storageSnapshot(),
    "Unconfirmed request mutated storage."
  );

  console.log(
    "PASS — missing explicit confirmation rejected before filesystem mutation."
  );

  /*
   * Invalid PDF must fail before evidence derivation/write.
   */
  const beforeInvalidPdf =
    await storageSnapshot();

  const invalidPdf =
    await postMultipart({
      baseUrl,

      fields: {
        symbol:
          "KCB",

        source:
          "CMA",

        confirmed:
          true,

        reason:
          "F14P invalid PDF rejection."
      },

      fileBuffer:
        Buffer.from(
          "NOT A PDF",
          "utf8"
        )
    });

  assert.equal(
    invalidPdf.status,
    415
  );

  assert.equal(
    invalidPdf.payload?.error,
    "FUNDAMENTAL_DOCUMENT_RETENTION_FORMAT_UNSUPPORTED"
  );

  assertStorageUnchanged(
    beforeInvalidPdf,
    await storageSnapshot(),
    "Invalid PDF request mutated storage."
  );

  console.log(
    "PASS — invalid PDF rejected before filesystem mutation."
  );

  /*
   * Identity mismatch must fail closed.
   */
  const wrongIssuerPdf =
    buildValidPdf([
      "EQUITY GROUP HOLDINGS PLC",
      "ANNUAL REPORT AND FINANCIAL STATEMENTS 2025",
      "For the year ended 31 December 2025"
    ]);

  const beforeMismatch =
    await storageSnapshot();

  const mismatch =
    await postMultipart({
      baseUrl,

      fields: {
        symbol:
          "KCB",

        source:
          "CMA",

        confirmed:
          true,

        reason:
          "F14P issuer mismatch rejection."
      },

      fileBuffer:
        wrongIssuerPdf
    });

  assert.ok(
    mismatch.status >= 400
  );

  assertStorageUnchanged(
    beforeMismatch,
    await storageSnapshot(),
    "Issuer mismatch mutated storage."
  );

  console.log(
    "PASS — issuer mismatch failed closed before retention."
  );

  /*
   * Finally attempt the valid explicit ADMIN action.
   *
   * If the existing identity/extraction parser accepts the
   * fixture, it must produce one canonical retained PDF.
   * If it requires richer PDF structure, report that as a
   * fixture-calibration REVIEW rather than weakening the
   * production identity policy.
   */
  const beforeValid =
    await storageSnapshot();

  const valid =
    await postMultipart({
      baseUrl,

      fields: {
        symbol:
          "KCB",

        source:
          "CMA",

        confirmed:
          true,

        reason:
          "F14P validated isolated retention."
      },

      fileBuffer:
        validPdf
    });

  if (
    valid.status === 200 &&
    valid.payload?.ok === true
  ) {
    assert.equal(
      valid.payload
        ?.retention
        ?.retained,
      true
    );

    const afterValid =
      await storageSnapshot();

    assert.equal(
      afterValid.length,
      beforeValid.length + 1
    );

    const retained =
      afterValid.find(
        item =>
          !beforeValid.some(
            previous =>
              previous.relativePath ===
                item.relativePath
          )
      );

    assert.ok(
      retained
    );

    assert.equal(
      retained.hash,
      sha256(validPdf)
    );

    console.log(
      "PASS — valid ADMIN multipart request retained exact uploaded bytes."
    );

    /*
     * Same request must be idempotent.
     */
    const repeat =
      await postMultipart({
        baseUrl,

        fields: {
          symbol:
            "KCB",

          source:
            "CMA",

          confirmed:
            true,

          reason:
            "F14P idempotent repeat."
        },

        fileBuffer:
          validPdf
      });

    assert.equal(
      repeat.status,
      200
    );

    assert.equal(
      repeat.payload
        ?.retention
        ?.retained,
      true
    );

    assert.equal(
      repeat.payload
        ?.retention
        ?.idempotent,
      true
    );

    assert.deepEqual(
      await storageSnapshot(),
      afterValid
    );

    console.log(
      "PASS — repeated ADMIN retention request is idempotent."
    );

    console.log(
      JSON.stringify(
        {
          retained:
            true,

          relativePath:
            valid.payload
              ?.retention
              ?.relativePath,

          contentHash:
            valid.payload
              ?.retention
              ?.contentHash,

          sizeBytes:
            valid.payload
              ?.retention
              ?.sizeBytes,

          storageScope:
            "OS_TEMP_ONLY"
        },
        null,
        2
      )
    );
  } else {
    console.log(
      "REVIEW — valid route fixture was not accepted by existing identity/extraction policy."
    );

    console.log(
      JSON.stringify(
        {
          status:
            valid.status,

          payload:
            valid.payload,

          storageBefore:
            beforeValid,

          storageAfter:
            await storageSnapshot()
        },
        null,
        2
      )
    );

    /*
     * This is intentionally not treated as permission to
     * weaken the production identity/extraction policy.
     */
    process.exitCode = 2;
  }

  console.log(
    "F10F14P_APPLICATION_ROUTE_REGISTRATION=NONE"
  );

  console.log(
    "F10F14P_PRODUCTION_SOURCE_MUTATION=NONE"
  );

  console.log(
    "F10F14P_ENV_FILE_MODIFICATION=NONE"
  );

  console.log(
    "F10F14P_PARENT_ENV_PERSISTENCE=NONE"
  );

  console.log(
    "F10F14P_DOCUMENT_WRITE=OS_TEMP_ONLY"
  );

  console.log(
    "F10F14P_PRODUCTION_STORAGE_ACTIVATION=NONE"
  );

  console.log(
    "F10F14P_LIVE_RETRIEVAL=NONE"
  );

  console.log(
    "F10F14P_PROVIDER_CALL=NONE"
  );

  console.log(
    "F10F14P_PROVIDER_COST=ZERO"
  );

  console.log(
    "F10F14P_DATABASE_MUTATION=NONE"
  );

  console.log(
    "F10F14P_FUNDAMENTAL_MUTATION=NONE"
  );

  console.log(
    "F10F14P_VERIFICATION=NONE"
  );

  console.log(
    "F10F14P_APPROVAL=NONE"
  );

  console.log(
    "F10F14P_PROMOTION=NONE"
  );

  console.log(
    "F10F14P_PUBLICATION=NONE"
  );

  console.log(
    "===== FUND-010F14P TEST COMPLETE ====="
  );
} finally {
  if (server) {
    await new Promise(
      resolve =>
        server.close(
          resolve
        )
    );
  }

  /*
   * Remove all isolated source copies and retained
   * OS-temp evidence after verification.
   */
  await fs.rm(
    tempRoot,
    {
      recursive: true,
      force: true
    }
  );

  delete process.env
    .FUNDAMENTAL_DOCUMENT_STORAGE_ROOT;

  console.log(
    "PASS — isolated F14P temporary workspace removed."
  );
}
