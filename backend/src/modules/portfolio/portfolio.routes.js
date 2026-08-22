import express from "express";

import { authRequired } from "../../middleware/authRequired.js";

import {
  createHolding,
  replaceAuthoritativePortfolioSnapshot,
  getUserPortfolio,
  getUserPortfolioAccounts
} from "./portfolio.service.js";

const router = express.Router();

router.put("/authoritative-snapshot", authRequired, async (req, res) => {
  try {
    const accountKey = String(req.body?.brokerAccountKey || "").trim().toUpperCase();
    const holdings = Array.isArray(req.body?.holdings) ? req.body.holdings : [];
    const result = await replaceAuthoritativePortfolioSnapshot(req.user.id, accountKey, holdings, req.body?.cashBalance);
    res.json(result);
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

router.get("/accounts", authRequired, async (req, res) => {
  try {
    const result = await getUserPortfolioAccounts(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.get("/", authRequired, async (req, res) => {
  try {
    const broker = req.query.broker;

    const result = await getUserPortfolio(req.user.id, { broker });

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

router.post("/", authRequired, async (req, res) => {
  try {
    const holdings = Array.isArray(req.body?.holdings)
      ? req.body.holdings
      : [req.body];

    const saved = [];

    for (const holding of holdings) {
      const symbol = String(holding.symbol || "").trim().toUpperCase();
      const quantity = Number(holding.quantity || 0);

      if (!symbol || symbol === "N/A" || quantity <= 0) {
        continue;
      }

      saved.push(await createHolding(req.user.id, holding));
    }

    res.json({
      ok: true,
      count: saved.length,
      holdings: saved
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
