import express from "express";
import crypto from "crypto";
import { authRequired } from "../../middleware/authRequired.js";
import {
  getCachedQuote,
  getMarketCache,
  getMarketCacheStatus,
  installManualMarketSnapshot,
  refreshMarketCache
} from "./marketCache.service.js";
import {
  prepareManualMarketImport,
  previewManualMarketImport
} from "./manualMarketImport.service.js";
import {
  getMarketCacheSchedulerStatus,
  startMarketCacheScheduler,
  stopMarketCacheScheduler
} from "./marketCache.scheduler.js";
import { collectVerifiedEodIfDue } from "./marketEodCollector.service.js";

const router = express.Router();

function requireMarketImportKey(req, res, next) {
  const configured = String(process.env.MARKET_IMPORT_KEY || "");
  const supplied = String(req.headers["x-market-import-key"] || "");
  if (!configured) {
    return res.status(503).json({ ok: false, error: "MARKET_IMPORT_KEY is not configured on the backend." });
  }
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return res.status(403).json({ ok: false, error: "Invalid market import authorization." });
  }
  return next();
}

router.post("/manual-import/preview", authRequired, requireMarketImportKey, (req, res) => {
  try {
    res.json({ ok: true, preview: previewManualMarketImport(req.body || {}) });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.post("/manual-import/commit", authRequired, requireMarketImportKey, async (req, res) => {
  try {
    const { snapshot, audit } = await prepareManualMarketImport(req.body || {});
    const cache = snapshot.valuationEligible
      ? installManualMarketSnapshot(snapshot)
      : null;
    res.json({
      ok: true,
      auditOnly: !snapshot.valuationEligible,
      message: snapshot.valuationEligible
        ? `${snapshot.count} verified myStocks prices installed.`
        : `${snapshot.count} daily price rows stored as audit evidence; the valuation cache was not changed.`,
      import: {
        provider: snapshot.provider,
        kind: snapshot.kind,
        marketDate: snapshot.marketDate,
        fileName: snapshot.fileName,
        checksum: snapshot.checksum,
        count: snapshot.count,
        rejectedCount: snapshot.rejected.length,
        auditName: audit.auditName
      },
      cache
    });
  } catch (error) {
    const status = error?.code === "EEXIST" ? 409 : 400;
    res.status(status).json({ ok: false, error: error.message });
  }
});

router.get("/status", (req, res) => {
  res.json(getMarketCacheStatus());
});

router.get("/prices", (req, res) => {
  res.json({
    ok: true,
    ...getMarketCache()
  });
});

router.get("/quote/:symbol", (req, res) => {
  const quote = getCachedQuote(req.params.symbol);

  if (!quote) {
    return res.status(404).json({
      ok: false,
      error: "Quote not found"
    });
  }

  res.json({
    ok: true,
    quote
  });
});

router.post("/refresh", async (req, res) => {
  try {
    const result = await refreshMarketCache();

    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.post("/eod/collect", authRequired, requireMarketImportKey, async (req, res) => {
  try {
    const collection = await collectVerifiedEodIfDue({ force: true });
    const cache = await refreshMarketCache();
    res.json({ ok: true, collection, cache });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/scheduler/status", (req, res) => {
  res.json(getMarketCacheSchedulerStatus());
});

router.post("/scheduler/start", (req, res) => {
  res.json(startMarketCacheScheduler());
});

router.post("/scheduler/stop", (req, res) => {
  res.json(stopMarketCacheScheduler());
});

export default router;
