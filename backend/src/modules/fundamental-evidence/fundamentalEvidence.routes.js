/*
 * PC-032G4B1C8G3D5B
 *
 * Retrieval/preview boundary only.
 * This route never persists fundamental evidence.
 */

import express from "express";

import {
  authRequired
} from "../../middleware/authRequired.js";

import {
  retrieveApifyFundamentalEvidence
} from "./apifyFundamentalEvidence.adapter.js";

import {
  resolveFundamentalProviderIdentity
} from "./fundamentalProviderIdentity.js";

import {
  previewIssuerFinancialEvidence
} from "./issuerFinancialEvidencePreview.service.js";

const router = express.Router();

/*
 * PC-032G4B1C8G3D6B
 * External fundamental retrieval is an authenticated preview action.
 * No server secret is accepted from or bundled into the investor client.
 * This route remains retrieval-only and performs no persistence.
 */
router.post(
  "/apify/preview",
  authRequired,
  async (req, res) => {
    try {
      const symbol =
        String(
          req.body?.symbol || ""
        )
          .trim()
          .toUpperCase();

      if (!symbol) {
        return res.status(400).json({
          ok: false,
          error:
            "A security symbol is required."
        });
      }

      const providerIdentity =
        resolveFundamentalProviderIdentity(
          symbol
        );

      if (!providerIdentity.providerSymbol) {
        return res.status(503).json({
          ok: false,
          previewOnly: true,
          persistence: "NONE",
          verifiedFiling: false,
          providerIdentityStatus:
            providerIdentity.providerIdentityStatus,
          symbol:
            providerIdentity.canonicalSymbol,
          error:
            "The fundamental provider symbol has not been qualified for this security."
        });
      }

      const result =
        await retrieveApifyFundamentalEvidence({
          symbol:
            providerIdentity.canonicalSymbol,
          providerSymbol:
            providerIdentity.providerSymbol
        });

      return res.json({
        ok: true,

        previewOnly: true,

        persistence:
          "NONE",

        verifiedFiling:
          false,

        ...result
      });
    } catch (error) {
      const message =
        error?.message ||
        "Fundamental evidence retrieval failed.";

      const configurationError =
        message.includes(
          "is not configured"
        ) ||
        message.includes(
          "is required"
        ) ||
        message.includes(
          "must be valid JSON"
        );

      return res
        .status(
          configurationError
            ? 503
            : 502
        )
        .json({
          ok: false,
          previewOnly: true,
          persistence: "NONE",
          verifiedFiling: false,
          error: message
        });
    }
  }
);

/*
 * PC-032G4B1C8G3D6F6D6G5D6C
 *
 * Authenticated issuer/regulator financial-evidence preview.
 *
 * The backend remains responsible for:
 * - qualified URL policy,
 * - bounded document retrieval,
 * - document identity inspection,
 * - financial evidence extraction,
 * - response sanitization.
 *
 * Preview only:
 * - no filing creation,
 * - no persistence,
 * - no verification,
 * - no approval,
 * - no promotion.
 */
router.post(
  "/issuer-document/preview",
  authRequired,
  async (req, res) => {
    try {
      const symbol =
        String(
          req.body?.symbol || ""
        )
          .trim()
          .toUpperCase();

      const url =
        String(
          req.body?.url || ""
        )
          .trim();

      if (!symbol) {
        return res.status(400).json({
          ok: false,
          previewOnly: true,
          extractionOnly: true,
          persistence: "NONE",
          verifiedFiling: false,
          verified: false,
          authoritative: false,
          error:
            "A security symbol is required."
        });
      }

      if (!url) {
        return res.status(400).json({
          ok: false,
          previewOnly: true,
          extractionOnly: true,
          persistence: "NONE",
          verifiedFiling: false,
          verified: false,
          authoritative: false,
          error:
            "An issuer or regulator document URL is required."
        });
      }

      const result =
        await previewIssuerFinancialEvidence({
          symbol,
          url
        });

      return res.json(result);
    } catch (error) {
      const message =
        error?.message ||
        "Issuer financial evidence preview failed.";

      return res
        .status(422)
        .json({
          ok: false,

          previewOnly: true,
          extractionOnly: true,
          persistence: "NONE",

          verifiedFiling: false,
          verified: false,
          authoritative: false,

          error: message
        });
    }
  }
);

export default router;
