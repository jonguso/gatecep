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

      const brokerIdentity =
        extraction.identity || {};

      const evidenceBroker =
        normalizeBroker(
          brokerIdentity.brokerId ||
          brokerIdentity.broker
        );

      const selectedBroker =
        normalizeBroker(
          context.broker.broker
        );

      const evidenceClientNumber =
        String(
          brokerIdentity.clientCode || ""
        ).trim();

      const selectedClientNumber =
        String(
          context.broker.clientNumber || ""
        ).trim();

      const evidenceCdsNumber =
        String(
          brokerIdentity.tradingAccount || ""
        ).trim();

      const selectedCdsNumber =
        String(
          context.broker.cdsNumber || ""
        ).trim();

      if (
        !evidenceBroker ||
        !selectedBroker ||
        evidenceBroker !== selectedBroker ||
        !evidenceClientNumber ||
        !selectedClientNumber ||
        evidenceClientNumber !==
          selectedClientNumber ||
        !evidenceCdsNumber ||
        !selectedCdsNumber ||
        evidenceCdsNumber !==
          selectedCdsNumber
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

          portfolioReadyRows
        },

        rows:
          extraction.rows
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

export default router;
