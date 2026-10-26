import express from "express";
import { authRequired } from "../../middleware/authRequired.js";
import {
  investorTransactionHistoryBootstrapHandler
} from "../transaction-history/investorBrokerTransactionHistoryBootstrap.controller.js";
import {
  investorTransactionHistoryReadHandler
} from "../transaction-history/investorBrokerTransactionHistoryRead.controller.js";
import {
  investorTransactionHistoryAppendHandler
} from "../transaction-history/investorBrokerTransactionHistoryAppend.controller.js";
import {
  getTransactions,
  recordTransaction
} from "./transaction.service.js";

const router = express.Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const result = await getTransactions(req.user.id, {
      broker: req.query.broker,
      type: req.query.type,
      limit: req.query.limit
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const transaction = await recordTransaction(req.user.id, req.body);

    res.json({
      ok: true,
      transaction
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});


/*
 * ADMIN-TXHIST-004D4-R7M-R2
 *
 * Bootstrap-only authenticated investor transport.
 *
 * Authority:
 * - authRequired establishes req.user.
 * - controller derives target investor from req.user.id.
 * - client cannot choose another investor.
 *
 * This is intentionally separate from Admin reset/maintenance.
 */
/*
 * R7O-R4E7R8
 *
 * Read-only authenticated canonical Transaction History.
 * Investor identity is derived from req.user.id.
 */
router.get(
  "/history",
  authRequired,
  investorTransactionHistoryReadHandler
);

router.post(
  "/history",
  authRequired,
  investorTransactionHistoryAppendHandler
);

router.post(
  "/history/bootstrap",
  authRequired,
  investorTransactionHistoryBootstrapHandler
);

export default router;