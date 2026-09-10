const VALID_SIDES = new Set(["BUY", "SELL"]);
const COMPLETED_EXECUTION_STATUSES = ["FULLY TRADED", "FILLED", "COMPLETED", "SETTLED"];
const NON_EXECUTED_STATUSES = ["REJECTED", "REFUSED", "CANCELLED", "CANCELED", "EXPIRED"];

export function classifyBrokerExecutionEvidence(record = {}) {
  const missing = [];
  const executionDate = String(record.executionDate || record.date || "").trim();
  const brokerReference = String(record.brokerReference || "").trim();
  const broker = String(record.broker || "").trim();
  const settlement = String(record.settlementStatus || record.settlementDate || "").trim();
  const fees = Number(record.totalFees ?? record.fees);
  const quantity = Number(record.quantity);
  const price = Number(record.price);
  const side = String(record.side || "").toUpperCase();
  const executionStatus = String(record.status || record.orderStatus || "").trim().toUpperCase();

  if (!executionDate || Number.isNaN(new Date(executionDate).getTime())) missing.push("BROKER_EXECUTION_DATE");
  if (!brokerReference) missing.push("BROKER_REFERENCE");
  if (!broker) missing.push("BROKER_SOURCE");
  if (!VALID_SIDES.has(side)) missing.push("SIDE");
  if (!(quantity > 0)) missing.push("EXECUTED_QUANTITY");
  if (!(price > 0)) missing.push("EXECUTED_PRICE");
  if (!Number.isFinite(fees) || fees < 0) missing.push("BROKER_AND_REGULATORY_FEES");
  if (!settlement) missing.push("SETTLEMENT_EVIDENCE");
  if (!COMPLETED_EXECUTION_STATUSES.some((accepted) => executionStatus.includes(accepted))) {
    missing.push(NON_EXECUTED_STATUSES.some((blocked) => executionStatus.includes(blocked)) ? "TRADE_NOT_EXECUTED" : "COMPLETED_EXECUTION_STATUS");
  }

  return {
    ...record,
    side,
    executionStatus,
    executionDate,
    date: executionDate,
    brokerReference,
    broker,
    totalFees: Number.isFinite(fees) ? fees : null,
    evidenceStatus: missing.length ? "UNVERIFIED" : "VERIFIED_BROKER_EXECUTION",
    missingEvidence: missing,
    canAffectRealPortfolio: missing.length === 0,
    sourceType: "BROKER_EXECUTION_EVIDENCE"
  };
}

export function partitionBrokerExecutionEvidence(records = []) {
  const classified = records.map(classifyBrokerExecutionEvidence);
  return {
    verified: classified.filter((record) => record.canAffectRealPortfolio),
    unverified: classified.filter((record) => !record.canAffectRealPortfolio)
  };
}
