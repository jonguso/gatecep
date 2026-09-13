import express from "express";
import { marketDataGateway } from "../../services/marketData/MarketDataGateway.js";

import {
  buildInvestorProfile
} from "../../services/investorProfile.service.js";

import {
  buildRecommendedPortfolio
} from "../../services/portfolioConstructor.service.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const {
      goal = "balanced_growth",
      risk = "balanced",
      experience = "beginner",
      timeHorizon = "3_5_years",
      contribution = "flexible",
      amount = 10000
    } = req.query;

    const profile = buildInvestorProfile({
      goal,
      risk,
      experience,
      timeHorizon,
      contribution
    });

    const pricesResult = await marketDataGateway.getPrices();
    const marketPriceLookup = Object.fromEntries(
      (pricesResult.data || [])
        .map((item) => [String(item.symbol || item.code || "").trim().toUpperCase(), item])
        .filter(([symbol]) => symbol)
    );

    const recommendation = buildRecommendedPortfolio(
      profile,
      Number(amount || 0),
      marketPriceLookup
    );

    const confidence = calculateConfidence(profile, recommendation);

    res.json({
      ok: true,
      profile,
      recommendation,
      confidence,
      brokerComparison: buildBrokerComparison(profile),
      explanation: [
        `Goal matched: ${profile.goal}`,
        `Risk profile: ${profile.risk}`,
        `Experience level: ${profile.experience}`,
        `Contribution plan: ${profile.contribution}`,
        `Cash reserve maintained at ${profile.constraints.cashReserve}%`,
        `Sector cap applied at ${profile.constraints.sectorCap}%`,
        `Single-position cap applied at ${profile.constraints.maxSinglePosition}%`
      ]
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

function calculateConfidence(profile, recommendation) {
  let score = 100;

  if (recommendation.portfolio.length < profile.constraints.minimumHoldings) {
    score -= 15;
  }

  const cashWeight =
    recommendation.amount > 0
      ? (recommendation.cash / recommendation.amount) * 100
      : 0;

  if (cashWeight < profile.constraints.cashReserve) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

function buildBrokerComparison(profile) {
  const brokers = [
    {
      name: "AIB",
      baseScore: 82,
      bestFor: "Beginners and long-term investors",
      signupUrl: "https://www.aib-axysafrica.com/",
      strengths: [
        "Beginner friendly",
        "Research support",
        "Good for portfolio building"
      ]
    },
    {
      name: "ABC",
      baseScore: 78,
      bestFor: "Active investors",
      signupUrl: "https://abc-capital.com/",
      strengths: [
        "Trading tools",
        "Execution speed",
        "Market access"
      ]
    },
    {
      name: "Dyer & Blair",
      baseScore: 76,
      bestFor: "Research-focused investors",
      signupUrl: "https://dyerandblair.com/",
      strengths: [
        "Research depth",
        "Institutional experience",
        "Advisory support"
      ]
    }
  ];

  return brokers
    .map((broker) => {
      let score = broker.baseScore;

      if (profile.experience === "beginner" && broker.name === "AIB") {
        score += 5;
      }

      if (profile.risk === "aggressive" && broker.name === "ABC") {
        score += 5;
      }

      if (profile.goal === "dividend" && broker.name === "Dyer & Blair") {
        score += 4;
      }

      return {
        ...broker,
        score: Math.min(score, 100)
      };
    })
    .sort((a, b) => b.score - a.score);
}

export default router;