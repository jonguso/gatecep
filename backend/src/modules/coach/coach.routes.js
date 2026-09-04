import express from "express";
import multer from "multer";
import { authRequired } from "../../middleware/authRequired.js";
import { getPortfolioSummary } from "../../services/domain/portfolio/PortfolioService.js";
import { calculatePortfolioPerformance } from "../../services/domain/performance/PerformanceService.js";
import { generateCoachDashboardInsights } from "../../services/domain/coach/CoachService.js";
import { generateIntelligentRecommendations } from "../../services/domain/coach/CoachIntelligenceService.js";
import { getCashSummary } from "../cash/cash.service.js";
import { getBrokerLinks } from "../broker-links/brokerLinks.service.js";

const router = express.Router();
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, done) => {
    const allowed = new Set(["audio/m4a", "audio/mp4", "audio/mpeg", "audio/wav", "audio/webm", "audio/x-m4a"]);
    const accepted = allowed.has(String(file.mimetype || "").toLowerCase());
    done(accepted ? null : new Error("Unsupported voice recording format."), accepted);
  }
});

function n(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return n(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildFloatingCoachAnswer({ question, portfolio, cashData, brokers, screenContext = {} }) {
  const text = String(question || "").trim();
  const lower = text.toLowerCase();
  const holdings = portfolio?.holdings || [];
  const totalValue = n(portfolio?.totalValue);
  const totalCash = n(cashData?.summary?.totalCash);
  const netWorth = totalValue + totalCash;
  const performance = calculatePortfolioPerformance(holdings);
  const sectors = performance?.allocation || [];
  const largestSector = sectors[0] || null;
  const largestHolding = [...(performance?.holdings || [])].sort((a, b) => n(b.value) - n(a.value))[0] || null;
  const insights = generateCoachDashboardInsights({ holdings, brokers, largestHolding, largestSector, totalCash, netWorth, gainPct: n(portfolio?.gainPct) });
  const intelligence = generateIntelligentRecommendations({ portfolio, performance, cashData, brokers });
  const symbol = String(screenContext?.symbol || "").trim().toUpperCase();
  const quote = screenContext?.quote || {};
  const evidence = [
    `REAL holdings: ${holdings.length}`,
    `Broker cash: KES ${money(totalCash)}`,
    `Portfolio source: authenticated backend`
  ];

  if (symbol && (lower.includes(symbol.toLowerCase()) || lower.includes("company") || lower.includes("security") || lower.includes("this stock"))) {
    const price = n(quote?.price);
    const changePct = Number(quote?.changePct);
    const quoteLine = price > 0
      ? `${symbol} is quoted at KES ${money(price)}${Number.isFinite(changePct) ? ` with a ${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% move` : ""}.`
      : `A verified current price for ${symbol} was not supplied to this conversation.`;
    return {
      answer: `${quoteLine} Review the company’s earnings history, valuation, balance-sheet strength, dividends, risks, and portfolio fit before making a decision. Coach G will not infer missing fundamentals from price movement alone.`,
      confidence: price > 0 ? 78 : 45,
      recommendation: "RESEARCH",
      evidence: [...evidence, `Screen context: ${symbol}`, `Market provider: ${quote?.provider || "unavailable"}`]
    };
  }

  if (lower.includes("risk") || lower.includes("reduce risk") || lower.includes("concentration")) {
    const concentration = largestSector?.name || largestSector?.sector || "unavailable";
    return {
      answer: largestSector
        ? `Your largest verified sector exposure is ${concentration}. Review whether that concentration matches your risk profile, goal, and time horizon before adding more to the same sector.`
        : "Coach G cannot measure concentration because verified REAL holding allocation is currently unavailable.",
      confidence: largestSector ? 82 : 35,
      recommendation: "REVIEW RISK",
      evidence
    };
  }

  if (lower.includes("cash") || lower.includes("funds") || lower.includes("liquidity")) {
    const cashWeight = netWorth > 0 ? (totalCash / netWorth) * 100 : null;
    return {
      answer: netWorth > 0
        ? `Your authenticated brokers report KES ${money(totalCash)} available cash, approximately ${cashWeight.toFixed(1)}% of REAL net worth. Keep emergency and near-term goal money separate before deciding how much is investable.`
        : "Verified REAL net-worth evidence is unavailable, so Coach G cannot assess cash deployment safely.",
      confidence: netWorth > 0 ? 90 : 30,
      recommendation: "REVIEW LIQUIDITY",
      evidence
    };
  }

  if (lower.includes("watch") || lower.includes("today") || lower.includes("focus") || lower.includes("next")) {
    const action = intelligence?.nextBestActions?.[0];
    const actionText = action?.title || action?.label || action?.description || insights?.recommendations?.[0]?.title || null;
    return {
      answer: actionText || insights?.coachMessage || "Coach G has no evidence-backed priority action right now. Continue monitoring verified market and broker updates.",
      confidence: actionText ? 80 : 50,
      recommendation: "NEXT FOCUS",
      evidence
    };
  }

  return {
    answer: insights?.coachMessage || `Coach G can currently explain your REAL portfolio risk, broker cash, next focus${symbol ? `, and ${symbol}` : ""}. Ask a focused question for evidence-based guidance.`,
    confidence: holdings.length || totalCash > 0 ? 70 : 40,
    recommendation: "GUIDANCE",
    evidence
  };
}

router.get("/dashboard", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    const [portfolio, cashData, brokers] = await Promise.all([
      getPortfolioSummary(userId),
      getCashSummary(userId),
      getBrokerLinks(userId)
    ]);

    const holdings = portfolio.holdings || [];
    const performance = calculatePortfolioPerformance(holdings);

    const totalValue = Number(portfolio.totalValue || 0);
    const investedValue = Number(portfolio.investedValue || 0);
    const totalGain = Number(portfolio.totalGain || 0);
    const gainPct = Number(portfolio.gainPct || 0);

    const totalCash = Number(cashData?.summary?.totalCash || 0);
    const netWorth = totalValue + totalCash;

    const sectors = performance.allocation || [];
    const largestSector = sectors[0] || null;

    const largestHolding =
      [...(performance.holdings || [])].sort((a, b) => b.value - a.value)[0] ||
      null;

    const coachInsights = generateCoachDashboardInsights({
      holdings,
      brokers,
      largestHolding,
      largestSector,
      totalCash,
      netWorth,
      gainPct
    });

const intelligence = generateIntelligentRecommendations({
  portfolio,
  performance,
  cashData,
  brokers
});

    res.json({
      ok: true,
      summary: {
        totalValue,
        investedValue,
        totalCash,
        netWorth,
        totalGain,
        gainPct,
        holdingsCount: holdings.length,
        brokersCount: brokers.length,
        cashWeight: coachInsights.cashWeight
      },
      largestSector,
      largestHolding,
      sectors,
           recommendations: coachInsights.recommendations,
      scores: coachInsights.scores,
      coachMessage: coachInsights.coachMessage,
      intelligence,
      dashboardCard: {
        status: intelligence.healthStatus?.status,
        label: intelligence.healthStatus?.label,
        tone: intelligence.healthStatus?.tone,
        headline: intelligence.primaryInsight?.title,
        summary: intelligence.coachNarrative,
        confidence: intelligence.healthStatus?.confidence,
        mainAction: intelligence.nextBestActions?.[0] || null,
        actions: intelligence.nextBestActions || []
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

router.post("/ask", authRequired, async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) return res.status(400).json({ ok: false, error: "A Coach G question is required." });
    if (question.length > 500) return res.status(400).json({ ok: false, error: "Keep Coach G questions under 500 characters." });

    const [portfolio, cashData, brokers] = await Promise.all([
      getPortfolioSummary(req.user.id),
      getCashSummary(req.user.id),
      getBrokerLinks(req.user.id)
    ]);
    const result = buildFloatingCoachAnswer({ question, portfolio, cashData, brokers, screenContext: req.body?.screenContext || {} });
    return res.json({ ok: true, ...result, readOnly: true, source: "AUTHENTICATED_REAL_CONTEXT" });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/voice/transcribe", authRequired, voiceUpload.single("audio"), async (req, res) => {
  try {
    if (!req.file?.buffer?.length) return res.status(400).json({ ok: false, error: "A voice recording is required." });
    const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) return res.status(503).json({ ok: false, error: "Coach G voice transcription is not configured." });

    const form = new FormData();
    form.append("model", process.env.COACH_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe");
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || "coach-g-question.m4a");
    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(502).json({ ok: false, error: "Coach G could not transcribe that recording." });
    const transcript = String(payload?.text || "").trim().slice(0, 500);
    if (!transcript) return res.status(422).json({ ok: false, error: "No speech was detected. Please try again." });
    return res.json({ ok: true, transcript, retained: false, readOnly: true });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || "Voice transcription failed." });
  }
});

export default router;
