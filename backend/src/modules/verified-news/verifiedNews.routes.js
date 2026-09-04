import crypto from "crypto";
import express from "express";
import { authRequired } from "../../middleware/authRequired.js";
import { collectVerifiedNews } from "./verifiedNews.collector.js";
import { listVerifiedCalendarEvents, listVerifiedNewsItems } from "./verifiedNews.repository.js";
import { getVerifiedNewsSchedulerStatus } from "./verifiedNews.scheduler.js";

const router = express.Router();

function requireImportKey(req, res, next) {
  const configured = String(process.env.MARKET_IMPORT_KEY || "");
  const supplied = String(req.headers["x-market-import-key"] || "");
  if (!configured) return res.status(503).json({ ok: false, error: "MARKET_IMPORT_KEY is not configured." });
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return res.status(403).json({ ok: false, error: "Invalid import authorization." });
  next();
}

router.get("/", authRequired, async (req, res) => {
  try {
    const category = ["Market", "Company", "Dividends"].includes(String(req.query.category || "")) ? String(req.query.category) : null;
    const items = await listVerifiedNewsItems({ category, symbol: req.query.symbol || null, limit: req.query.limit || 100 });
    const sources = [...new Set(items.map((item) => item.source))];
    res.json({ ok: true, provider: "APIFY_RAG_WEB_BROWSER", count: items.length, sources, items, scheduler: getVerifiedNewsSchedulerStatus() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/collect", authRequired, requireImportKey, async (_req, res) => {
  try {
    res.json({ ok: true, ...(await collectVerifiedNews()) });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message });
  }
});

router.get("/scheduler/status", authRequired, (_req, res) => res.json({ ok: true, ...getVerifiedNewsSchedulerStatus() }));

router.get("/calendar", authRequired, async (req, res) => {
  try {
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return res.status(400).json({ ok: false, error: "Valid from and to dates are required." });
    const events = await listVerifiedCalendarEvents({ from, to, limit: req.query.limit || 250 });
    res.json({ ok: true, provider: "APIFY_RAG_WEB_BROWSER", count: events.length, events });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;
