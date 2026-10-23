import express from "express";

import {
  authRequired
} from "../../middleware/authRequired.js";

import {
  findFundamentalRecordBySymbol
} from "./fundamentalPersistence.repository.js";

const router = express.Router();

function normalizeSymbol(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

router.get(
  "/:symbol",
  authRequired,
  async (req, res) => {
    try {
      const symbol =
        normalizeSymbol(
          req.params?.symbol
        );

      if (!symbol) {
        return res.status(400).json({
          ok: false,
          error:
            "A security symbol is required.",
          code:
            "FUNDAMENTAL_SYMBOL_REQUIRED"
        });
      }

      const record =
        await findFundamentalRecordBySymbol(
          symbol
        );

      if (!record) {
        return res.status(404).json({
          ok: false,
          error:
            "Published fundamentals were not found.",
          code:
            "FUNDAMENTAL_RECORD_NOT_FOUND",
          symbol
        });
      }

      return res.json({
        ok: true,
        symbol:
          record.symbol,
        companyName:
          record.companyName,
        approvedFilingId:
          record.approvedFilingId,
        revisionNumber:
          record.revisionNumber,
        promotedAt:
          record.promotedAt,
        fundamentals:
          record.fundamentalPayload
      });
    } catch (error) {
      console.error(
        "Canonical fundamental read failed:",
        error?.message ||
          String(error)
      );

      return res.status(500).json({
        ok: false,
        error:
          "Unable to load published fundamentals.",
        code:
          "FUNDAMENTAL_READ_FAILED"
      });
    }
  }
);

export default router;
