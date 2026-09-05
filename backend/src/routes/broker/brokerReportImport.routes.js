import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import { authRequired } from "../../middleware/authRequired.js";
import { extractBrokerPdf } from "../../services/brokerReports/brokerPdfExtraction.service.js";

import {
  normalizeHolding,
  normalizeValuation,
  normalizeOrder,
  normalizeTransaction
} from "../../services/brokerReports/brokerReportNormalizer.service.js";

import {
  saveBrokerMirror,
  getBrokerMirror
} from "../../repositories/brokerMirror.repository.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post("/extract-pdf", authRequired, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "PDF file required." });
    if (req.file.mimetype !== "application/pdf" && !req.file.originalname.toLowerCase().endsWith(".pdf")) {
      return res.status(415).json({ ok: false, error: "Only PDF broker evidence is accepted." });
    }
    const result = await extractBrokerPdf(req.file.buffer, req.body.reportType);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(422).json({ ok: false, error: error.message });
  }
});

function normalizeBroker(value) {
  const broker = String(value || "AIB").trim().toUpperCase();

  if (broker.includes("AIB")) return "AIB";
  if (broker.includes("ABC")) return "ABC";
  if (broker.includes("NCBA")) return "NCBA";

  return broker || "AIB";
}

function cleanNumber(value) {
  const cleaned = String(value ?? 0)
    .replaceAll(",", "")
    .replaceAll("'", "")
    .replace(/KES/gi, "")
    .trim();

  const num = Number(cleaned);

  return Number.isFinite(num) ? num : 0;
}

function normalizeUploadedRows(buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer"
  });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  return XLSX.utils.sheet_to_json(sheet, {
    defval: ""
  });
}

function attachContext(row, context) {
  return {
    ...row,
    broker: context.broker,
    clientNumber: context.clientNumber,
    cdsNumber: context.cdsNumber,
    email: context.email,
    brokerLinkId: context.brokerLinkId
  };
}

function normalizeRows(reportType, rows, context) {
  switch (reportType) {
    case "holdings":
      return rows.map((row) =>
        normalizeHolding(attachContext(row, context))
      );

    case "valuation":
      return rows.map((row) =>
        normalizeValuation(attachContext(row, context))
      );

    case "orders":
      return rows.map((row) =>
        normalizeOrder(attachContext(row, context))
      );

    case "transactions":
      return rows.map((row) =>
        normalizeTransaction(attachContext(row, context))
      );

    case "cash":
      return rows.map((row) => ({
        broker: context.broker,
        clientNumber: context.clientNumber,
        cdsNumber: context.cdsNumber,
        email: context.email,
        brokerLinkId: context.brokerLinkId,
        date: row.Date || row.date || "",
        type: row.Type || row.type || "",
        description:
          row.Particulars ||
          row.Description ||
          row.description ||
          "",
        quantity: cleanNumber(row.Quantity || row.quantity),
        price: cleanNumber(row.Price || row.price),
        debit: cleanNumber(row.Debit || row.debit),
        credit: cleanNumber(row.Credit || row.credit),
        balance:
          row.Balance ||
          row.balance ||
          row.ledgerBalance ||
          row.availableCash ||
          ""
      }));

    default:
      return null;
  }
}

function saveReportSnapshot(context, reportType, normalized) {
  return saveBrokerMirror(
    context.broker,
    reportType,
    normalized,
    {
      replace: reportType === "valuation",
      brokerLinkId: context.brokerLinkId,
      clientNumber: context.clientNumber,
      cdsNumber: context.cdsNumber,
      email: context.email
    }
  );
}

function buildContext(source = {}) {
  return {
    broker: normalizeBroker(source.broker),
    clientNumber: String(source.clientNumber || "").trim(),
    cdsNumber: String(source.cdsNumber || "").trim(),
    email: String(source.email || "").trim(),
    brokerLinkId: String(source.brokerLinkId || "").trim()
  };
}

router.post("/import", async (req, res) => {
  try {
    const reportType = req.body.reportType || "";
    const rows = req.body.rows || [];
    const context = buildContext(req.body);

    const normalized = normalizeRows(reportType, rows, context);

    if (!normalized) {
      return res.status(400).json({
        ok: false,
        error: "unsupported report type"
      });
    }

    const saved = saveReportSnapshot(context, reportType, normalized);

    res.json({
      ok: true,
      broker: context.broker,
      clientNumber: context.clientNumber,
      cdsNumber: context.cdsNumber,
      brokerLinkId: context.brokerLinkId,
      reportType,
      imported: normalized.length,
      storedCount: saved.length,
      duplicatesSkipped:
        normalized.length > saved.length
          ? normalized.length - saved.length
          : 0,
      stored: true,
      data: saved
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const reportType = req.body.reportType || "holdings";
    const context = buildContext(req.body);

    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "file required"
      });
    }

    const rows = normalizeUploadedRows(req.file.buffer);
    const normalized = normalizeRows(reportType, rows, context);

    if (!normalized) {
      return res.status(400).json({
        ok: false,
        error: "unsupported report type"
      });
    }

    const saved = saveReportSnapshot(context, reportType, normalized);

    res.json({
      ok: true,
      broker: context.broker,
      clientNumber: context.clientNumber,
      cdsNumber: context.cdsNumber,
      brokerLinkId: context.brokerLinkId,
      reportType,
      filename: req.file.originalname,
      imported: normalized.length,
      storedCount: saved.length,
      duplicatesSkipped:
        normalized.length > saved.length
          ? normalized.length - saved.length
          : 0,
      stored: true,
      data: saved
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.get("/mirror/:broker/:reportType", (req, res) => {
  const broker = normalizeBroker(req.params.broker);
  const clientNumber = String(req.query.clientNumber || "").trim();
  const cdsNumber = String(req.query.cdsNumber || "").trim();

  let data = getBrokerMirror(broker, req.params.reportType);

  if (clientNumber || cdsNumber) {
    data = data.filter((row) => {
      return (
        (!clientNumber || String(row.clientNumber || "").trim() === clientNumber) &&
        (!cdsNumber || String(row.cdsNumber || "").trim() === cdsNumber)
      );
    });
  }

  res.json({
    ok: true,
    broker,
    clientNumber,
    cdsNumber,
    reportType: req.params.reportType,
    count: data.length,
    data
  });
});

router.get("/summary/:broker", (req, res) => {
  const broker = normalizeBroker(req.params.broker);
  const clientNumber = String(req.query.clientNumber || "").trim();
  const cdsNumber = String(req.query.cdsNumber || "").trim();

  let holdings = getBrokerMirror(broker, "holdings");

  if (clientNumber || cdsNumber) {
    holdings = holdings.filter((row) => {
      return (
        (!clientNumber || String(row.clientNumber || "").trim() === clientNumber) &&
        (!cdsNumber || String(row.cdsNumber || "").trim() === cdsNumber)
      );
    });
  }

  const totalQuantity = holdings.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  res.json({
    ok: true,
    broker,
    clientNumber,
    cdsNumber,
    holdingsCount: holdings.length,
    totalQuantity,
    symbols: holdings.map((x) => x.symbol),
    topHoldings: [...holdings]
      .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
      .slice(0, 5)
  });
});

router.get("/exposure/:broker", (req, res) => {
  const broker = normalizeBroker(req.params.broker);
  const clientNumber = String(req.query.clientNumber || "").trim();
  const cdsNumber = String(req.query.cdsNumber || "").trim();

  let holdings = getBrokerMirror(broker, "holdings");

  if (clientNumber || cdsNumber) {
    holdings = holdings.filter((row) => {
      return (
        (!clientNumber || String(row.clientNumber || "").trim() === clientNumber) &&
        (!cdsNumber || String(row.cdsNumber || "").trim() === cdsNumber)
      );
    });
  }

  const total = holdings.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const exposure = holdings.map((holding) => ({
    symbol: holding.symbol,
    quantity: holding.quantity,
    exposurePct:
      total > 0
        ? Number(((holding.quantity / total) * 100).toFixed(2))
        : 0
  }));

  res.json({
    ok: true,
    broker,
    clientNumber,
    cdsNumber,
    totalQuantity: total,
    exposure
  });
});

export default router;
