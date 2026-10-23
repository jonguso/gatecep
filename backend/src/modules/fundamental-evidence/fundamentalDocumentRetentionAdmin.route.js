import express from "express";
import multer from "multer";

import {
  authRequired
} from "../../middleware/authRequired.js";

import {
  requireAdmin
} from "../../middleware/requireRole.js";

import {
  inspectIssuerDocumentIdentity
} from "./issuerDocumentIdentityInspector.js";

import {
  extractIssuerFinancialStatementEvidence
} from "./issuerFinancialStatementEvidenceExtractor.js";

import {
  resolveRuntimeFundamentalDocumentStorageConfig
} from "./fundamentalDocumentStorageConfig.runtime.js";

import {
  executeFundamentalDocumentRetention
} from "./fundamentalDocumentRetentionAction.service.js";

import {
  authorizeFundamentalDocumentRetention
} from "./fundamentalDocumentRetentionAction.policy.js";

const router =
  express.Router();

const MAX_DOCUMENT_BYTES =
  20 * 1024 * 1024;

const documentUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        MAX_DOCUMENT_BYTES
    }
  });

function clean(value) {
  return String(
    value ?? ""
  ).trim();
}

function canonicalSymbol(value) {
  return clean(value)
    .toUpperCase();
}

function canonicalSource(value) {
  return clean(value)
    .toUpperCase();
}

function retentionUploadSingle(
  req,
  res,
  next
) {
  documentUpload.single("file")(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (
        error?.name ===
          "MulterError"
      ) {
        const tooLarge =
          error.code ===
            "LIMIT_FILE_SIZE";

        return res
          .status(
            tooLarge
              ? 413
              : 400
          )
          .json({
            ok: false,

            error:
              tooLarge
                ? "FUNDAMENTAL_DOCUMENT_RETENTION_FILE_TOO_LARGE"
                : "FUNDAMENTAL_DOCUMENT_RETENTION_UPLOAD_INVALID",

            message:
              tooLarge
                ? "Fundamental document exceeds the 20 MB limit."
                : "Fundamental document upload is invalid."
          });
      }

      return next(error);
    }
  );
}

function validatePdf(file) {
  if (
    !file ||
    !Buffer.isBuffer(
      file.buffer
    ) ||
    file.buffer.length === 0
  ) {
    const error =
      new Error(
        "A PDF fundamental document is required."
      );

    error.status = 400;
    error.code =
      "FUNDAMENTAL_DOCUMENT_RETENTION_FILE_REQUIRED";

    throw error;
  }

  const fileName =
    clean(
      file.originalname
    );

  const mimeType =
    clean(
      file.mimetype
    ).toLowerCase();

  const pdfByName =
    fileName
      .toLowerCase()
      .endsWith(".pdf");

  const pdfByType =
    mimeType ===
      "application/pdf";

  const pdfBySignature =
    file.buffer
      .subarray(0, 5)
      .toString("ascii") ===
        "%PDF-";

  if (
    !pdfBySignature ||
    (!pdfByName && !pdfByType)
  ) {
    const error =
      new Error(
        "Only PDF fundamental documents are accepted."
      );

    error.status = 415;
    error.code =
      "FUNDAMENTAL_DOCUMENT_RETENTION_FORMAT_UNSUPPORTED";

    throw error;
  }

  return {
    fileName,
    mimeType:
      mimeType ||
      "application/pdf"
  };
}

function validateRequestBody(
  body
) {
  const request =
    body &&
    typeof body === "object" &&
    !Array.isArray(body)
      ? body
      : {};

  const allowedFields =
    new Set([
      "symbol",
      "source",
      "confirmed",
      "reason"
    ]);

  const unsupportedFields =
    Object.keys(request)
      .filter(
        field =>
          !allowedFields.has(
            field
          )
      )
      .sort();

  if (
    unsupportedFields.length >
      0
  ) {
    const error =
      new Error(
        "Document retention request contains unsupported fields."
      );

    error.status = 400;
    error.code =
      "FUNDAMENTAL_DOCUMENT_RETENTION_REQUEST_INVALID";

    error.unsupportedFields =
      unsupportedFields;

    throw error;
  }

  const symbol =
    canonicalSymbol(
      request.symbol
    );

  if (!symbol) {
    const error =
      new Error(
        "A canonical NSE security symbol is required."
      );

    error.status = 400;
    error.code =
      "FUNDAMENTAL_DOCUMENT_RETENTION_SYMBOL_REQUIRED";

    throw error;
  }

  const source =
    canonicalSource(
      request.source
    );

  if (!source) {
    const error =
      new Error(
        "A document source is required."
      );

    error.status = 400;
    error.code =
      "FUNDAMENTAL_DOCUMENT_RETENTION_SOURCE_REQUIRED";

    throw error;
  }

  return {
    symbol,
    source,

    /*
     * Multipart form fields arrive as strings.
     *
     * Normalize only the exact representations accepted by
     * this HTTP boundary. F14J still receives and requires
     * literal boolean true.
     *
     * Values such as "TRUE", "1", "yes" and arbitrary
     * truthy strings remain false and therefore fail closed.
     */
    confirmed:
      request.confirmed === true ||
      request.confirmed === "true",

    reason:
      request.reason
  };
}

/*
 * Build evidence only from the exact uploaded bytes.
 *
 * Browser-supplied identity/extraction/retrieval evidence
 * is deliberately not accepted by this route.
 */
async function deriveRetentionEvidence({
  symbol,
  file,
  fileMetadata
}) {
  const retrieval = {
    retrievalMethod:
      "ADMIN_PDF_UPLOAD",

    fileName:
      fileMetadata.fileName,

    contentType:
      fileMetadata.mimeType,

    byteLength:
      file.buffer.length,

    retrievedAt:
      new Date()
        .toISOString(),

    persistence:
      "NONE",

    verifiedFiling:
      false,

    verified:
      false,

    authoritative:
      false
  };

  const identity =
    await inspectIssuerDocumentIdentity({
      symbol,
      documentBuffer:
        file.buffer,
      retrieval
    });

  const extraction =
    await extractIssuerFinancialStatementEvidence({
      symbol,
      documentBuffer:
        file.buffer,
      identity,
      retrieval
    });

  return {
    identity,
    extraction,
    retrieval
  };
}

/*
 * Explicit ADMIN-only document-retention action.
 *
 * This route is intentionally separate from the
 * issuer-document preview routes.
 *
 * It does NOT:
 * - retrieve a remote document,
 * - verify a filing,
 * - approve a filing,
 * - promote fundamentals,
 * - publish fundamentals,
 * - mutate canonical fundamental data.
 *
 * The retained PDF remains source evidence only.
 */
router.post(
  "/fundamentals/documents/retain",
  authRequired,
  requireAdmin,
  retentionUploadSingle,
  async (req, res) => {
    try {
      const request =
        validateRequestBody(
          req.body
        );

      const fileMetadata =
        validatePdf(
          req.file
        );

      /*
       * Reject unauthorized/unconfirmed actions before
       * document identity inspection or financial extraction.
       *
       * F14K deliberately repeats this authorization at the
       * retention boundary for defense in depth.
       */
      authorizeFundamentalDocumentRetention({
        actor: {
          id:
            req.user.id,

          role:
            req.user.role
        },

        confirmed:
          request.confirmed,

        reason:
          request.reason
      });

      const evidence =
        await deriveRetentionEvidence({
          symbol:
            request.symbol,

          file:
            req.file,

          fileMetadata
        });

      /*
       * Runtime storage configuration is resolved only
       * after authentication, authorization, request
       * validation and server-side evidence derivation.
       *
       * No default storage root exists.
       */
      const storage =
        resolveRuntimeFundamentalDocumentStorageConfig();

      const result =
        await executeFundamentalDocumentRetention({
          actor: {
            id:
              req.user.id,

            role:
              req.user.role
          },

          confirmed:
            request.confirmed,

          reason:
            request.reason,

          symbol:
            request.symbol,

          source:
            request.source,

          identity:
            evidence.identity,

          extraction:
            evidence.extraction,

          retrieval:
            evidence.retrieval,

          documentBuffer:
            req.file.buffer,

          storageRoot:
            storage.storageRoot
        });

      return res.json({
        ok: true,

        retention: {
          retained:
            result.retained,

          created:
            result.created,

          idempotent:
            result.idempotent,

          reason:
            result.reason,

          relativePath:
            result.relativePath,

          contentHash:
            result.contentHash,

          sizeBytes:
            result.sizeBytes
        },

        action:
          result.action
      });
    } catch (error) {
      const status =
        Number.isInteger(
          error?.status
        )
          ? error.status
          : Number.isInteger(
              error?.statusCode
            )
            ? error.statusCode
            : 422;

      return res
        .status(status)
        .json({
          ok: false,

          error:
            error?.code ||
            "FUNDAMENTAL_DOCUMENT_RETENTION_FAILED",

          message:
            error?.message ||
            "Fundamental document retention failed.",

          ...(Array.isArray(
            error?.unsupportedFields
          )
            ? {
                unsupportedFields:
                  error
                    .unsupportedFields
              }
            : {})
        });
    }
  }
);

export {
  MAX_DOCUMENT_BYTES,
  validatePdf,
  validateRequestBody,
  deriveRetentionEvidence
};

export default router;
