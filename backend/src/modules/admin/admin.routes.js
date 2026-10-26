import { createHash } from "node:crypto";
import express from "express";
import multer from "multer";

import { normalizeBroker } from "../../utils/normalizeBroker.js";

import {
  authRequired
} from "../../middleware/authRequired.js";

import {
  extractAdminReconciliationEvidence
} from "./adminReconciliationEvidenceExtraction.service.js";

import {
  verifyAdminReconciliationEvidenceIdentity
} from "./adminReconciliationEvidenceIdentity.service.js";

import {
  createVerifiedAdminReconciliationEvidenceReceipt
} from "./adminReconciliationEvidenceReceipt.service.js";

import {
  requireAdmin
} from "../../middleware/requireRole.js";

import {
  listUsersForAdmin
} from "../users/users.repository.js";

import {
  changeUserRole
} from "./adminRole.service.js";

import {
  changeAdminUserStatus
} from "./adminAccountStatus.service.js";

import {
  listAdminAuditEvents
} from "../admin-audit/adminAudit.repository.js";

import {
  listAdminReconciliationTargets,
  getAdminTargetBrokerLinks,
  getAdminReconciliationBroker
} from "./adminReconciliationTarget.service.js";

import {
  commitAdminBrokerReconciliation
} from "./adminReconciliationCommit.service.js";

import {
  appendAdminAssistedTransactionHistory
} from "./adminAssistedTransactionHistoryAppend.service.js";

import {
  reviewAdminTransactionHistoryUpload,
  mapAdminReviewedNewExecutionsForCanonicalAppend
} from "./adminTransactionHistoryReview.service.js";

import {
  loadAuthenticatedInvestorTransactionHistory
} from "../transaction-history/investorBrokerTransactionHistory.service.js";


import fundamentalDocumentRetentionAdminRoutes from "../fundamental-evidence/fundamentalDocumentRetentionAdmin.route.js";

import {
  transitionFundamentalVerifiedFiling
} from "../fundamental-evidence/fundamentalFilingLifecycle.service.js";

import {
  promoteApprovedFundamentalFiling
} from "../fundamental-evidence/fundamentalPromotion.service.js";

import {
  createFundamentalVerifiedFilingDraft
} from "../fundamental-evidence/fundamentalFilingIntake.service.js";

import {
  findFundamentalVerifiedFilingById
} from "../fundamental-evidence/fundamentalPersistence.repository.js";

const router = express.Router();

const reconciliationEvidenceUpload =
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  });

function reconciliationEvidenceUploadSingle(
  req,
  res,
  next
) {
  reconciliationEvidenceUpload.single("file")(
    req,
    res,
    (error) => {
      if (!error) {
        return next();
      }

      if (error?.name === "MulterError") {
        const tooLarge =
          error.code ===
          "LIMIT_FILE_SIZE";

        return res
          .status(tooLarge ? 413 : 400)
          .json({
            ok: false,
            error:
              tooLarge
                ? "RECONCILIATION_EVIDENCE_TOO_LARGE"
                : "RECONCILIATION_EVIDENCE_UPLOAD_INVALID",
            message:
              tooLarge
                ? "Broker evidence exceeds the 5 MB limit."
                : "Evidence upload is invalid."
          });
      }

      return next(error);
    }
  );
}

import {
  getAdminBrokerTransactionHistoryBackup
} from "./adminBrokerTransactionHistoryBackup.service.js";

import {
  resetAdminBrokerTransactionHistory
} from "./adminBrokerTransactionHistoryReset.service.js";

router.get(
  "/overview",
  authRequired,
  requireAdmin,
  (req, res) => {
    return res.json({
      ok: true,
      admin: true,
      service: "gatecep-admin",
      user: {
        id: req.user.id,
        role: req.user.role
      }
    });
  }
);

router.get(
  "/users",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const users =
        await listUsersForAdmin();

      return res.json({
        ok: true,
        users
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/reconciliation-targets",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const targets =
        await listAdminReconciliationTargets();

      return res.json({
        ok: true,
        targets
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/reconciliation-targets/:userId/broker-links/:brokerLinkId/evidence-preview",
  authRequired,
  requireAdmin,
  reconciliationEvidenceUploadSingle,
  async (req, res, next) => {
    try {
      const context =
        await getAdminReconciliationBroker({
          targetUserId:
            req.params.userId,
          brokerLinkId:
            req.params.brokerLinkId
        });

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error:
            "RECONCILIATION_EVIDENCE_REQUIRED",
          message:
            "Broker evidence file is required."
        });
      }

      const originalName =
        String(
          req.file.originalname || ""
        );

      const requestedReportType =
        String(
          req.body?.reportType || ""
        )
          .trim()
          .toLowerCase();

      if (
        requestedReportType !== "valuation" &&
        requestedReportType !== "cash"
      ) {
        return res.status(400).json({
          ok: false,
          error:
            "RECONCILIATION_REPORT_TYPE_UNSUPPORTED",
          message:
            "Admin portfolio preview currently accepts valuation or cash evidence."
        });
      }

      const extraction =
        await extractAdminReconciliationEvidence({
          buffer:
            req.file.buffer,
          fileName:
            originalName,
          mimeType:
            req.file.mimetype,
          reportType:
            requestedReportType
        });

      const identityVerification =
        verifyAdminReconciliationEvidenceIdentity({
          broker: context.broker,
          extraction,
          fileName:
            originalName
        });

      let evidenceReceipt = null;

      if (
        identityVerification?.identityVerified === true
      ) {
        evidenceReceipt =
          await createVerifiedAdminReconciliationEvidenceReceipt({
            actorUserId:
              req.user.id,
            targetUserId:
              context.target.id,
            brokerLinkId:
              req.params.brokerLinkId,
            brokerAccountKey:
              context.brokerAccountKey,
            reportType:
              extraction.reportType,
            fileBuffer:
              req.file.buffer,
            extraction,
            identityVerification
          });
      }

      return res.json({
        ok: true,
        previewOnly: true,
        target: context.target,
        broker: context.broker,
        brokerAccountKey:
          context.brokerAccountKey,
        extraction,
        identityVerification,
        evidenceReceipt:
          evidenceReceipt
            ? {
                id:
                  evidenceReceipt.id,
                reportType:
                  evidenceReceipt.reportType,
                expiresAt:
                  evidenceReceipt.expiresAt
              }
            : null
      });
    } catch (error) {
      if (
        Number.isInteger(error?.status) &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return res
          .status(error.status)
          .json({
            ok: false,
            error:
              error.code ||
              "RECONCILIATION_EVIDENCE_REJECTED",
            message:
              error.message
          });
      }

      if (
        error?.name === "MulterError"
      ) {
        const tooLarge =
          error.code ===
          "LIMIT_FILE_SIZE";

        return res
          .status(tooLarge ? 413 : 400)
          .json({
            ok: false,
            error:
              tooLarge
                ? "RECONCILIATION_EVIDENCE_TOO_LARGE"
                : "RECONCILIATION_EVIDENCE_UPLOAD_REJECTED",
            message:
              tooLarge
                ? "Broker evidence exceeds the 5 MB limit."
                : error.message
          });
      }

      if (error instanceof Error) {
        return res.status(422).json({
          ok: false,
          error:
            "RECONCILIATION_EVIDENCE_EXTRACTION_FAILED",
          message:
            error.message
        });
      }

      return next(error);
    }
  }
);

router.post(
  "/reconciliation-targets/:userId/broker-links/:brokerLinkId/transaction-history-append",
  authRequired,
  requireAdmin,
  reconciliationEvidenceUploadSingle,
  async (req, res, next) => {
    try {
      /*
       * Security boundary:
       * the browser supplies the evidence file only.
       *
       * It does NOT supply:
       * - target authority
       * - broker account authority
       * - canonical executions
       * - NEW/EXISTING classification
       * - observed generation
       *
       * All of those are resolved again by the server.
       */
      const context =
        await getAdminReconciliationBroker({
          targetUserId:
            req.params.userId,

          brokerLinkId:
            req.params.brokerLinkId
        });

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error:
            "RECONCILIATION_EXECUTION_EVIDENCE_REQUIRED",
          message:
            "Transaction / Lot History evidence file is required."
        });
      }

      const originalName =
        String(
          req.file.originalname || ""
        );

      const extension =
        originalName
          .toLowerCase()
          .match(/\.[^.]+$/)?.[0] || "";

      if (
        extension !== ".pdf" &&
        extension !== ".csv"
      ) {
        return res.status(415).json({
          ok: false,
          error:
            "RECONCILIATION_HISTORY_FORMAT_UNSUPPORTED",
          message:
            "Transaction / Lot History must be PDF or CSV."
        });
      }

      const extraction =
        await extractAdminReconciliationEvidence({
          buffer:
            req.file.buffer,

          fileName:
            originalName,

          mimeType:
            req.file.mimetype,

          reportType:
            "transactions"
        });

      if (
        !Array.isArray(extraction?.rows) ||
        extraction.rows.length === 0
      ) {
        const error =
          new Error(
            "Transaction / Lot History contains no rows."
          );

        error.status = 422;
        error.code =
          "RECONCILIATION_HISTORY_EMPTY";

        throw error;
      }

      const identityVerification =
        verifyAdminReconciliationEvidenceIdentity({
          broker:
            context.broker,

          extraction,

          fileName:
            originalName
        });

      if (
        identityVerification
          ?.identityVerified !== true
      ) {
        return res.status(409).json({
          ok: false,
          error:
            "RECONCILIATION_EXECUTION_IDENTITY_MISMATCH",
          message:
            "Transaction / Lot History does not match the selected investor broker account."
        });
      }

      const portfolioReadyRows =
        extraction.rows.filter(
          row =>
            row[
              "Can Affect Real Portfolio"
            ] === true
        ).length;

      if (portfolioReadyRows !== 0) {
        const error =
          new Error(
            "Transaction / Lot History unexpectedly contains portfolio-ready execution evidence."
          );

        error.status = 409;
        error.code =
          "RECONCILIATION_HISTORY_PORTFOLIO_READY_FORBIDDEN";

        throw error;
      }

      /*
       * Reload canonical history at append time.
       *
       * This deliberately does not trust the earlier
       * preview. If another operation changed history
       * after preview, this review sees the latest state.
       */
      const canonicalHistory =
        await loadAuthenticatedInvestorTransactionHistory({
          authenticatedUserId:
            context.target.id,

          brokerLinkId:
            context.broker.id
        });

      if (
        canonicalHistory
          ?.authorityEstablished !== true
      ) {
        const error =
          new Error(
            "Canonical Transaction History authority has not been established for the selected investor broker account."
          );

        error.status = 409;
        error.code =
          "ADMIN_TRANSACTION_HISTORY_AUTHORITY_NOT_ESTABLISHED";

        throw error;
      }

      const observedGeneration =
        Number(
          canonicalHistory
            .currentGeneration
        );

      if (
        !Number.isInteger(
          observedGeneration
        ) ||
        observedGeneration < 1
      ) {
        const error =
          new Error(
            "Canonical Transaction History authority is invalid for the selected investor broker account."
          );

        error.status = 409;
        error.code =
          "ADMIN_TRANSACTION_HISTORY_AUTHORITY_INVALID";

        throw error;
      }

      const review =
        reviewAdminTransactionHistoryUpload({
          rawRows:
            extraction.rows,

          brokerAccountKey:
            context.brokerAccountKey,

          existingCanonicalHistory:
            canonicalHistory.history
        });

      if (
        review.summary
          .reviewRequiredCount > 0
      ) {
        const error =
          new Error(
            "Transaction / Lot History contains executions that require review. No transactions were added."
          );

        error.status = 409;
        error.code =
          "ADMIN_TRANSACTION_HISTORY_REVIEW_REQUIRED";

        throw error;
      }

      /*
       * A repeat upload is a successful no-op:
       * all previously appended executions classify as
       * EXISTING and nothing is sent to canonical append.
       */
      if (
        review.summary.newCount === 0
      ) {
        return res.json({
          ok: true,

          noChange: true,

          target:
            context.target,

          broker:
            context.broker,

          brokerAccountKey:
            context.brokerAccountKey,

          transactionHistory: {
            fileName:
              originalName,

            rowCount:
              extraction.rows.length,

            canonicalCount:
              canonicalHistory.count,

            reviewSummary:
              review.summary
          },

          assistedTransactionHistoryAppend:
            null
        });
      }

      const newExecutions =
        mapAdminReviewedNewExecutionsForCanonicalAppend(
          review.newRows,
          {
            brokerAccountKey:
              context.brokerAccountKey,

            sourceFileName:
              originalName
          }
        );

      /*
       * R32 remains the canonical append/audit service.
       * It independently reloads canonical authority and
       * verifies observedGeneration before writing.
       */
      const result =
        await appendAdminAssistedTransactionHistory({
          actorUserId:
            req.user.id,

          targetUserId:
            context.target.id,

          brokerLinkId:
            context.broker.id,

          observedGeneration,

          executions:
            newExecutions,

          sourceFileName:
            originalName,

          ticketReference:
            req.body?.ticketReference
        });

      return res.json({
        ok: true,
        noChange: false,

        transactionHistory: {
          fileName:
            originalName,

          rowCount:
            extraction.rows.length,

          canonicalCountBefore:
            canonicalHistory.count,

          reviewSummary:
            review.summary
        },

        assistedTransactionHistoryAppend:
          result
      });
    } catch (error) {
      const status =
        Number.isInteger(error?.status)
          ? error.status
          : error?.code ===
              "STALE_TRANSACTION_HISTORY_GENERATION"
            ? 409
            : 400;

      return res
        .status(status)
        .json({
          ok: false,
          error:
            error?.code ||
            "ADMIN_ASSISTED_TRANSACTION_HISTORY_APPEND_REJECTED",
          message:
            error?.message ||
            "Admin-assisted Transaction History upload was rejected."
        });
    }
  }
);

router.post(
  "/reconciliation-targets/:userId/broker-links/:brokerLinkId/execution-evidence-preview",
  authRequired,
  requireAdmin,
  reconciliationEvidenceUploadSingle,
  async (req, res, next) => {
    try {
      const context =
        await getAdminReconciliationBroker({
          targetUserId:
            req.params.userId,
          brokerLinkId:
            req.params.brokerLinkId
        });

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error:
            "RECONCILIATION_EXECUTION_EVIDENCE_REQUIRED",
          message:
            "Transaction / Lot History evidence file is required."
        });
      }

      const originalName =
        String(
          req.file.originalname || ""
        );

      const extension =
        originalName
          .toLowerCase()
          .match(/\.[^.]+$/)?.[0] || "";

      if (
        extension !== ".pdf" &&
        extension !== ".csv"
      ) {
        return res.status(415).json({
          ok: false,
          error:
            "RECONCILIATION_HISTORY_FORMAT_UNSUPPORTED",
          message:
            "Transaction / Lot History must be PDF or CSV."
        });
      }

      const extraction =
        await extractAdminReconciliationEvidence({
          buffer:
            req.file.buffer,
          fileName:
            originalName,
          mimeType:
            req.file.mimetype,
          reportType:
            "transactions"
        });

      if (
        !Array.isArray(extraction?.rows) ||
        extraction.rows.length === 0
      ) {
        const error =
          new Error(
            "Transaction / Lot History contains no rows."
          );

        error.status = 422;
        error.code =
          "RECONCILIATION_HISTORY_EMPTY";

        throw error;
      }

      const identityVerification =
        verifyAdminReconciliationEvidenceIdentity({
          broker:
            context.broker,
          extraction,
          fileName:
            originalName
        });

      if (
        identityVerification
          ?.identityVerified !== true
      ) {
        return res.status(409).json({
          ok: false,
          error:
            "RECONCILIATION_EXECUTION_IDENTITY_MISMATCH",
          message:
            "Transaction / Lot History does not match the selected investor broker account."
        });
      }

      const portfolioReadyRows =
        extraction.rows.filter(
          row =>
            row[
              "Can Affect Real Portfolio"
            ] === true
        ).length;

      /*
       * Order History is lifecycle/executed-quantity
       * evidence only. It does not provide authoritative
       * execution price/fees for cost-bearing lots.
       */
      if (portfolioReadyRows !== 0) {
        const error =
          new Error(
            "Transaction / Lot History unexpectedly contains portfolio-ready execution evidence."
          );

        error.status = 409;
        error.code =
          "RECONCILIATION_HISTORY_PORTFOLIO_READY_FORBIDDEN";

        throw error;
      }

      /*
       * The selected investor and broker link were resolved
       * above by the server. Use that validated investor
       * identity to read the same canonical Transaction
       * History authority used by the investor upload path.
       *
       * Admin identity is the actor only; it must never
       * become the owner of the investor's history.
       */
      const canonicalHistory =
        await loadAuthenticatedInvestorTransactionHistory({
          authenticatedUserId:
            context.target.id,

          brokerLinkId:
            context.broker.id
        });

      if (
        canonicalHistory
          ?.authorityEstablished !== true
      ) {
        const error =
          new Error(
            "Canonical Transaction History authority has not been established for the selected investor broker account."
          );

        error.status = 409;
        error.code =
          "ADMIN_TRANSACTION_HISTORY_AUTHORITY_NOT_ESTABLISHED";

        throw error;
      }

      const observedGeneration =
        Number(
          canonicalHistory
            .currentGeneration
        );

      if (
        !Number.isInteger(
          observedGeneration
        ) ||
        observedGeneration < 1
      ) {
        const error =
          new Error(
            "Canonical Transaction History authority is invalid for the selected investor broker account."
          );

        error.status = 409;
        error.code =
          "ADMIN_TRANSACTION_HISTORY_AUTHORITY_INVALID";

        throw error;
      }

      const review =
        reviewAdminTransactionHistoryUpload({
          rawRows:
            extraction.rows,

          brokerAccountKey:
            context.brokerAccountKey,

          existingCanonicalHistory:
            canonicalHistory.history
        });

      const newExecutions =
        mapAdminReviewedNewExecutionsForCanonicalAppend(
          review.newRows,
          {
            brokerAccountKey:
              context.brokerAccountKey,

            sourceFileName:
              originalName
          }
        );

      return res.json({
        ok: true,
        previewOnly: true,

        target:
          context.target,

        broker:
          context.broker,

        brokerAccountKey:
          context.brokerAccountKey,

        transactionHistory: {
          fileName:
            originalName,

          fileType:
            extraction.fileType ||
            extension.slice(1),

          pageCount:
            extraction.pageCount ?? null,

          rowCount:
            extraction.rows.length,

          identity:
            extraction.identity,

          portfolioReadyRows,

          canonicalCount:
            canonicalHistory.count,

          observedGeneration,

          reviewSummary:
            review.summary
        },

        review: {
          summary:
            review.summary,

          newExecutions,

          existingCount:
            review.existingRows.length,

          reviewRequiredCount:
            review.reviewRows.length,

          ignoredCount:
            review.ignoredRows.length
        }
      });
    } catch (error) {
      const status =
        Number.isInteger(error?.status)
          ? error.status
          : Number.isInteger(error?.statusCode)
            ? error.statusCode
            : null;

      if (
        status &&
        status >= 400 &&
        status < 500
      ) {
        return res
          .status(status)
          .json({
            ok: false,
            error:
              error.code ||
              "RECONCILIATION_EXECUTION_EVIDENCE_REJECTED",
            message:
              error.message
          });
      }

      if (error instanceof Error) {
        return res.status(422).json({
          ok: false,
          error:
            error.code ||
            "RECONCILIATION_EXECUTION_EVIDENCE_INVALID",
          message:
            error.message
        });
      }

      return next(error);
    }
  }
);

router.get(
  "/reconciliation-targets/:userId/broker-links/:brokerLinkId/context",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const result =
        await getAdminReconciliationBroker({
          targetUserId: req.params.userId,
          brokerLinkId: req.params.brokerLinkId
        });

      res.json({
        ok: true,
        ...result
      });
    } catch (error) {
      if (
        Number.isInteger(error?.status) &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return res.status(error.status).json({
          ok: false,
          error:
            error.code ||
            "RECONCILIATION_CONTEXT_REJECTED",
          message: error.message
        });
      }

      next(error);
    }
  }
);

router.get(
  "/reconciliation-targets/:userId/broker-links",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const result =
        await getAdminTargetBrokerLinks({
          targetUserId:
            req.params.userId
        });

      return res.json({
        ok: true,
        target: result.target,
        brokers: result.brokers
      });
    } catch (error) {
      if (
        Number.isInteger(error?.status) &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return res
          .status(error.status)
          .json({
            ok: false,
            error:
              error.code ||
              "RECONCILIATION_TARGET_REJECTED",
            message:
              error.message
          });
      }

      return next(error);
    }
  }
);

router.get(
  "/audit-events",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const requestedLimit =
        Number.parseInt(
          String(req.query?.limit || ""),
          10
        );

      const limit =
        Number.isInteger(requestedLimit)
          ? requestedLimit
          : 100;

      const events =
        await listAdminAuditEvents({
          limit
        });

      return res.json({
        ok: true,
        events
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.patch(
  "/users/:userId/role",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const user =
        await changeUserRole({
          actorUserId:
            req.user.id,

          targetUserId:
            req.params.userId,

          requestedRole:
            req.body?.role,

          reason:
            req.body?.reason
        });

      return res.json({
        ok: true,
        user
      });
    } catch (error) {
      if (
        Number.isInteger(error?.status) &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return res
          .status(error.status)
          .json({
            ok: false,
            error:
              error.code ||
              "ROLE_CHANGE_REJECTED",
            message:
              error.message
          });
      }

      return next(error);
    }
  }
);


router.patch(
  "/users/:userId/status",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const user =
        await changeAdminUserStatus({
          actorUserId:
            req.user.id,

          targetUserId:
            req.params.userId,

          status:
            req.body?.status,

          reason:
            req.body?.reason
        });

      return res.json({
        ok: true,
        user
      });
    } catch (error) {
      if (
        Number.isInteger(error?.status) &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return res
          .status(error.status)
          .json({
            ok: false,
            error:
              error.code ||
              "ACCOUNT_STATUS_CHANGE_REJECTED",
            message:
              error.message
          });
      }

      return next(error);
    }
  }
);


router.post(
  "/reconciliation-targets/:userId/broker-links/:brokerLinkId/commit",
  authRequired,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        valuationReceiptId,
        cashReceiptId,
        reason,
        confirmed
      } = req.body || {};

      const result =
        await commitAdminBrokerReconciliation({
          actorUserId:
            req.user.id,
          targetUserId:
            req.params.userId,
          brokerLinkId:
            req.params.brokerLinkId,
          valuationReceiptId,
          cashReceiptId,
          reason,
          confirmed
        });

      return res.json({
        ok: true,
        reconciliation: result
      });
    } catch (error) {
      const status =
        Number.isInteger(
          error?.status
        )
          ? error.status
          : 500;

      const payload = {
        error:
          error?.code ||
          "ADMIN_RECONCILIATION_COMMIT_FAILED",
        message:
          error?.message ||
          "Admin broker reconciliation commit failed."
      };

      return res
        .status(status)
        .json(payload);
    }
  }
);


router.get(
  "/fundamentals/filings/:filingId",
  authRequired,
  requireAdmin,
  async (req, res) => {
    try {
      const filing =
        await findFundamentalVerifiedFilingById(
          req.params.filingId
        );

      if (!filing) {
        return res
          .status(404)
          .json({
            ok: false,
            error:
              "FUNDAMENTAL_FILING_NOT_FOUND",
            message:
              "Fundamental filing was not found."
          });
      }

      return res.json({
        ok: true,
        filing
      });
    } catch (error) {
      const status =
        Number.isInteger(
          error?.status
        )
          ? error.status
          : 500;

      return res
        .status(status)
        .json({
          ok: false,
          error:
            error?.code ||
            "FUNDAMENTAL_FILING_READ_FAILED",
          message:
            error?.message ||
            "Unable to read fundamental filing."
        });
    }
  }
);


router.post(
  "/fundamentals/filings/:filingId/lifecycle",
  authRequired,
  requireAdmin,
  async (req, res) => {
    try {
      const body =
        req.body || {};

      const allowedFields =
        new Set(["action", "note"]);

      const unexpectedFields =
        Object.keys(body).filter(
          (field) =>
            !allowedFields.has(field)
        );

      if (unexpectedFields.length > 0) {
        return res
          .status(400)
          .json({
            ok: false,
            error:
              "FUNDAMENTAL_LIFECYCLE_REQUEST_INVALID",
            message:
              "Lifecycle request contains unsupported fields.",
            unsupportedFields:
              unexpectedFields.sort()
          });
      }

      const {
        action,
        note
      } = body;

      const result =
        await transitionFundamentalVerifiedFiling({
          actorUserId:
            req.user.id,
          filingId:
            req.params.filingId,
          action,
          note
        });

      return res.json({
        ok: true,
        lifecycle: result
      });
    } catch (error) {
      const status =
        Number.isInteger(
          error?.status
        )
          ? error.status
          : 500;

      return res
        .status(status)
        .json({
          ok: false,
          error:
            error?.code ||
            "FUNDAMENTAL_LIFECYCLE_TRANSITION_FAILED",
          message:
            error?.message ||
            "Fundamental filing lifecycle transition failed."
        });
    }
  }
);


router.post(
  "/fundamentals/filings",
  authRequired,
  requireAdmin,
  async (req, res) => {
    try {
      const body =
        req.body &&
        typeof req.body === "object" &&
        !Array.isArray(req.body)
          ? req.body
          : {};

      const allowedFields =
        new Set([
          "symbol",
          "companyName",
          "filingType",
          "fiscalYear",
          "periodStart",
          "periodEnd",
          "publicationDate",
          "sourceDocument",
          "company",
          "metadata"
        ]);

      const unsupportedFields =
        Object.keys(body)
          .filter(
            (field) =>
              !allowedFields.has(field)
          )
          .sort();

      if (
        unsupportedFields.length > 0
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            error:
              "FUNDAMENTAL_FILING_INTAKE_REQUEST_INVALID",
            message:
              "Filing intake request contains unsupported fields.",
            unsupportedFields
          });
      }

      const result =
        await createFundamentalVerifiedFilingDraft({
          actorUserId:
            req.user.id,

          payload:
            body
        });

      return res
        .status(201)
        .json({
          ok: true,
          filing:
            result.filing,
          auditEventId:
            result.auditEventId
        });
    } catch (error) {
      const status =
        Number.isInteger(
          error?.status
        )
          ? error.status
          : 500;

      return res
        .status(status)
        .json({
          ok: false,
          error:
            error?.code ||
            "FUNDAMENTAL_FILING_INTAKE_FAILED",
          message:
            error?.message ||
            "Fundamental filing intake failed.",
          ...(Array.isArray(
            error?.unsupportedFields
          )
            ? {
                unsupportedFields:
                  error.unsupportedFields
              }
            : {})
        });
    }
  }
);


router.post(
  "/fundamentals/filings/:filingId/promote",
  authRequired,
  requireAdmin,
  async (req, res) => {
    try {
      const {
        reason,
        confirmed
      } = req.body || {};

      const result =
        await promoteApprovedFundamentalFiling({
          actorUserId:
            req.user.id,
          filingId:
            req.params.filingId,
          reason,
          confirmed
        });

      return res.json({
        ok: true,
        promotion: result
      });
    } catch (error) {
      const status =
        Number.isInteger(
          error?.status
        )
          ? error.status
          : 500;

      return res
        .status(status)
        .json({
          ok: false,
          error:
            error?.code ||
            "FUNDAMENTAL_PROMOTION_FAILED",
          message:
            error?.message ||
            "Fundamental filing promotion failed."
        });
    }
  }
);


/*
 * Explicit ADMIN fundamental-document retention.
 *
 * The child router preserves its own authRequired,
 * requireAdmin, upload, confirmation and evidence
 * derivation boundaries.
 *
 * Mounted here so the canonical application path is:
 * POST /admin/fundamentals/documents/retain
 */
router.use(
  fundamentalDocumentRetentionAdminRoutes
);


/*
 * ADMIN-TXHIST permanent maintenance boundary.
 *
 * Authentication and Admin authorization are enforced explicitly
 * on each maintenance route. Actor identity always comes from
 * req.user and never from browser input.
 */
router.get(
  "/reconciliation-targets/:userId/broker-links/:brokerLinkId/transaction-history/backup",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const result =
        await getAdminBrokerTransactionHistoryBackup({
          actorUserId:
            req.user?.id,

          targetUserId:
            req.params.userId,

          brokerLinkId:
            req.params.brokerLinkId
        });

      return res.status(200).json({
        ok: true,
        backup: result
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/reconciliation-targets/:userId/broker-links/:brokerLinkId/transaction-history/reset",
  authRequired,
  requireAdmin,
  async (req, res, next) => {
    try {
      const result =
        await resetAdminBrokerTransactionHistory({
          actorUserId:
            req.user?.id,

          targetUserId:
            req.params.userId,

          brokerLinkId:
            req.params.brokerLinkId,

          observedGeneration:
            req.body?.observedGeneration,

          physicalExecutionCount:
            req.body?.physicalExecutionCount,

          historyStateSha256:
            req.body?.historyStateSha256,

          reason:
            req.body?.reason,

          confirmed:
            req.body?.confirmed
        });

      return res.status(200).json({
        ok: true,

        reset: {
          targetUserId:
            result.targetUserId,

          brokerLinkId:
            result.brokerLinkId,

          brokerAccountKey:
            result.brokerAccountKey,

          resetModel:
            result.resetModel,

          validationOnly:
            result.validationOnly,

          currentGeneration:
            result.currentGeneration,

          physicalExecutionCount:
            result.physicalExecutionCount,

          historyStateSha256:
            result.historyStateSha256,

          deletedCount:
            result.deletedCount,

          physicalExecutionCountAfter:
            result.physicalExecutionCountAfter,

          physicalDelete:
            result.physicalDelete,

          generationsDeleted:
            result.generationsDeleted,

          auditEventId:
            result.auditEventId
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
