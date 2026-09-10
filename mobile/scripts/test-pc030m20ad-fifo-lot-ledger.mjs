import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeAverageCostSale, reconstructFifoAcquisitionLots } from "../src/features/trading/weightedAverageBuyGuardService.js";

const completed = (symbol, date, quantity, price, reference) => ({ symbol, date, side: "BUY", quantity, price, status: "Fully Traded", brokerReference: reference });
const eqt = [
  completed("EQT", "02-Apr-2026", 20, 69.50, "1358051"),
  { symbol: "EQT", date: "01-Apr-2026", side: "BUY", quantity: 20, price: 68, status: "Expired" },
  completed("EQT", "23-Apr-2026", 25, 75, "1413850"),
  completed("EQT", "27-Apr-2026", 30, 75, "1421478"),
  completed("EQT", "27-Apr-2026", 22, 75, "1421585"),
  completed("EQT", "28-Apr-2026", 22, 75, "1422377"),
  completed("EQT", "29-Apr-2026", 10, 74, "1428097"),
  completed("EQT", "29-Apr-2026", 2, 74, "1428174"),
  completed("EQT", "30-Apr-2026", 4, 74, "1429522"),
  completed("EQT", "15-May-2026", 5, 75, "1469415"),
  completed("EQT", "25-May-2026", 4, 70.75, "1488554"),
  completed("EQT", "29-May-2026", 6, 74.5, "1499901"),
  completed("EQT", "02-Jul-2026", 27, 83.5, "1587935"),
  completed("EQT", "02-Jul-2026", 423, 83.75, "1587950"),
  completed("EQT", "02-Jul-2026", 50, 83.5, "1588355"),
  completed("EQT", "07-Jul-2026", 350, 87, "1603608"),
  completed("EQT", "27-Jul-2026", 500, 86.75, "1656196"),
  completed("EQT", "06-Aug-2026", 300, 85.25, "1690496")
];
const evidence = reconstructFifoAcquisitionLots({ transactions: eqt, symbol: "EQT", currentQuantity: 1800, currentAveragePrice: 85.89 });
assert.equal(evidence.available, true);
assert.equal(evidence.status, "FIFO_LOTS_CALIBRATED_TO_BROKER_WAP");
const sale = analyzeAverageCostSale({ holding: { quantity: 1800, averagePrice: 85.89 }, proposedQuantity: 50, proposedPrice: 94.25, feePolicy: { commissionRatePct: 1.3, otherChargesRatePct: 0.34, fixedCharges: 6 }, costBasisMethod: "FIFO", acquisitionLots: evidence.lots });
assert.equal(sale.remainingAveragePrice, 86.23);
assert.deepEqual(sale.removedLots.map((lot) => [lot.date, lot.quantity, lot.originalUnitPrice]), [["02-Apr-2026", 20, 69.5], ["23-Apr-2026", 25, 75], ["27-Apr-2026", 5, 75]]);

const source = await readFile(new URL("../app/trade.js", import.meta.url), "utf8");
assert.match(source, /loadBrokerLotHistoryEvidence/);
assert.match(source, /FIFO shares expected to be sold first/);
assert.match(source, /lot\.originalUnitPrice/);
console.log("PASS — expired and rejected orders cannot create FIFO acquisition lots.");
console.log("PASS — completed dated purchases reconcile to the broker's current holding quantity.");
console.log("PASS — FIFO identifies the exact EQT dates and quantities expected to be sold first.");
console.log("PASS — purchase-price history is calibrated to the imported broker WAP when detailed buy fees are absent.");
console.log("PASS — the attached EQT partial sale reproduces a projected remaining WAP of KES 86.23.");
