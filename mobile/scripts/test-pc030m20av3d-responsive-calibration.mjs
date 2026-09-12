import fs from "node:fs";
import assert from "node:assert/strict";
const paths={
 trading:"app/(tabs)/trading.js",order:"app/order-book.js",history:"app/trade-history.js",
 transactions:"app/transactions.js",upload:"app/transactions-upload.js",sync:"app/portfolio-sync-center.js"
};
const src=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,fs.readFileSync(p,"utf8")]));
for(const [k,s] of Object.entries(src)){assert.ok(s.includes("PC-030M20AV3D RESPONSIVE CALIBRATION"),`${k}: marker missing`);assert.ok(s.includes("useWindowDimensions"),`${k}: width hook missing`);}
for(const k of ["trading","order","history","transactions","upload"]){assert.ok(src[k].includes("maxWidth: 960"),`${k}: desktop containment missing`);assert.ok(src[k].includes("paddingBottom: 128"),`${k}: mobile clearance missing`);}
assert.ok(src.trading.includes("buildDecisionLabBaseline")&&src.trading.includes("buildAccommodationAnalysis"));
assert.ok(src.order.includes('userGetItem("practiceSimulatedTrades")'));
assert.ok(src.history.includes('AsyncStorage.getItem("gatecepSimulatedTrades")'));
assert.ok(src.transactions.includes("loadTransactionLedgerReconciliation"));
assert.ok(src.transactions.includes("horizontal showsHorizontalScrollIndicator={false}"));
assert.ok(src.transactions.includes("cannot create trades, invent adjustment shares, or mutate REAL or Practice portfolios"));
assert.ok(src.upload.includes("partitionBrokerExecutionEvidence"));
assert.ok(src.upload.includes('userSetItem("unverifiedTransactionHistory"'));
assert.ok(src.upload.includes("rebuildCanonicalPortfolioLedger"));
assert.ok(src.upload.includes('router.replace("/portfolio-sync-center")'));
assert.ok(src.sync.includes("valuationReady && cashEvidenceReady && transactionHistoryReady"));
assert.ok(src.sync.includes('router.push("/transactions-upload?mode=RECONCILE")'));
assert.ok(src.sync.includes("adoptVerifiedBrokerSnapshot"));
assert.ok(src.sync.includes("confirm-broker-snapshot-replacement"));
assert.ok(src.sync.includes("compact={av3dWidth < 520}"));
console.log("PASS — six AV3D targets contain responsive calibration.");
console.log("PASS — classic screens use centered desktop containment and mobile bottom clearance.");
console.log("PASS — reconciliation evidence tables retain horizontal scrolling.");
console.log("PASS — Practice/REAL and verified/unverified evidence boundaries remain present.");
console.log("PASS — Portfolio Sync Center still requires valuation + cash + transaction history and explicit confirmation.");
console.log("PC-030M20AV3D contract verification complete.");
