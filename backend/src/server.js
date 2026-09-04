import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import investorDNARoutes from "./modules/investor-dna/investorDNA.routes.js";
import portfolioRoutes from "./modules/portfolio/portfolio.routes.js";
import cashRoutes from "./modules/cash/cash.routes.js";
import brokerLinksRoutes from "./modules/broker-links/brokerLinks.routes.js";
import performanceRoutes from "./modules/performance/performance.routes.js";
import coachRoutes from "./modules/coach/coach.routes.js";
import eventsRouter from "./modules/events/events.routes.js";
import notificationsRouter from "./modules/notifications/notifications.routes.js";
import intelligenceRouter from "./modules/intelligence/intelligence.routes.js";
import dividendRouter from "./modules/dividends/dividend.routes.js";
import timelineRouter from "./modules/timeline/timeline.routes.js";
import brokerSyncRoutes from "./modules/broker-adapters/brokerSync.routes.js";
import transactionRoutes from "./modules/transactions/transaction.routes.js";
import marketIntelligenceRoutes from "./modules/market-intelligence/marketIntelligence.routes.js";
import marketCacheRoutes from "./modules/market-cache/marketCache.routes.js";
import { getMarketCache } from "./modules/market-cache/marketCache.service.js";
import { startMarketCacheScheduler } from "./modules/market-cache/marketCache.scheduler.js";
import { registerMarketCacheSocket } from "./modules/market-cache/marketCache.socket.js";
import { registerLivePortfolioSocket } from "./modules/live-portfolio/livePortfolio.socket.js";
import livePortfolioRoutes from "./modules/live-portfolio/livePortfolio.routes.js";
import portfolioHealthRoutes from "./modules/portfolio-health/portfolioHealth.routes.js";
import diagnosticsRoutes from "./modules/diagnostics/diagnostics.routes.js";
import investorProfileRoutes from "./modules/investor-profile/investorProfile.routes.js";
import userProfileRoutes from "./modules/user-profile/userProfile.routes.js";
import verifiedNewsRoutes from "./modules/verified-news/verifiedNews.routes.js";
import { startVerifiedNewsScheduler } from "./modules/verified-news/verifiedNews.scheduler.js";
import { startRedis } from "./cache/redisClient.js";
import {
  registerActiveUser,
  unregisterSocket
} from "./modules/live-portfolio/livePortfolio.registry.js";

import brokerLinkRoutes from "./routes/broker/brokerLink.routes.js";
import brokerReportRoutes from "./routes/broker/brokerReportImport.routes.js";
import brokerPortfolioRoutes from "./routes/broker/brokerPortfolio.routes.js";
import brokerHeatmapRoutes from "./routes/broker/brokerHeatmap.routes.js";

import brokerMirrorScoreRoutes from "./routes/coachg/brokerMirrorScore.routes.js";
import brokerMirrorRebalanceRoutes from "./routes/coachg/brokerMirrorRebalance.routes.js";
import investmentPlannerRoutes from "./routes/coachg/investmentPlanner.routes.js";
import generatePortfolioRoutes from "./routes/coachg/generatePortfolio.routes.js";
import goalTrackerRoutes from "./routes/coachg/goalTracker.routes.js";
import stressTestRoutes from "./routes/coachg/stressTest.routes.js";
import starterBasketRoutes from "./routes/coachg/starterBasket.routes.js";
import newInvestorPlanRoutes from "./routes/coachg/newInvestorPlan.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = String(process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
    credentials: true
  })
);


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ ok: true, app: "gatecep-backend" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "gatecep-backend" });
});

// Canonical mobile compatibility route. The same cache is also available at
// /market-cache/prices; this alias prevents the two clients from drifting.
app.get("/prices", (req, res) => {
  res.json({ ok: true, ...getMarketCache() });
});


/*
 * Broker mirror / portfolio routes
 */
app.use("/user-portfolio", portfolioRoutes);
app.use("/user-cash", cashRoutes);
app.use("/user-brokers", brokerLinksRoutes);
app.use("/portfolio-performance", performanceRoutes);
app.use("/coach", coachRoutes);
app.use("/events", eventsRouter);
app.use("/notifications", notificationsRouter);
app.use("/intelligence", intelligenceRouter);
app.use("/dividends", dividendRouter);
app.use("/timeline", timelineRouter);
app.use("/broker-adapters", brokerSyncRoutes);
app.use("/transactions", transactionRoutes);
app.use("/market-intelligence", marketIntelligenceRoutes);
app.use("/market-cache", marketCacheRoutes);
app.use("/live-portfolio", livePortfolioRoutes);
app.use("/portfolio-health", portfolioHealthRoutes);
app.use("/diagnostics", diagnosticsRoutes);
app.use("/investor-profile", investorProfileRoutes);
app.use("/investor-dna", investorDNARoutes);
app.use("/user-profile", userProfileRoutes);
app.use("/verified-news", verifiedNewsRoutes);

app.use("/coach-g/broker-link", brokerLinkRoutes);
app.use("/broker-reports", brokerReportRoutes);
app.use("/broker-portfolio", brokerPortfolioRoutes);
app.use("/broker-heatmap", brokerHeatmapRoutes);

/*
 * Coach G / advisory routes
 */
app.use("/broker-mirror-score", brokerMirrorScoreRoutes);
app.use("/broker-mirror-rebalance", brokerMirrorRebalanceRoutes);
app.use("/investment-planner", investmentPlannerRoutes);
app.use("/generate-portfolio", generatePortfolioRoutes);
app.use("/goal-tracker", goalTrackerRoutes);
app.use("/stress-test", stressTestRoutes);
app.use("/starter-basket", starterBasketRoutes);
app.use("/new-investor-plan", newInvestorPlanRoutes);


app.use("/auth", authRoutes);
app.use("/users", usersRoutes);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found",
    method: req.method,
    path: req.originalUrl
  });
});

app.use((error, req, res, next) => {
  res.status(500).json({
    ok: false,
    error: error.message
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
    credentials: true
  }
});

registerMarketCacheSocket(io);

registerLivePortfolioSocket(io);

io.on("connection", (socket) => {
const userId = socket.handshake.auth?.userId;

if (userId) {
  registerActiveUser(userId, socket.id);
  console.log("Live portfolio user registered:", userId);
}

  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
   unregisterSocket(socket.id);
  });
});

server.listen(PORT, async () => {
  console.log(`Gatecep backend running on ${PORT}`);
  startRedis();

  const schedulerStatus = startMarketCacheScheduler();
  console.log(
    `Market cache scheduler: running=${schedulerStatus.running}, interval=${schedulerStatus.intervalMs}ms`
  );
  const newsSchedulerStatus = startVerifiedNewsScheduler();
  console.log(`Verified news scheduler: running=${newsSchedulerStatus.running}, interval=${newsSchedulerStatus.intervalMs || "disabled"}ms`);
});
