import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const LEDGER_KEY =
  "brokerResolutionDecisionLedger";

function normalize(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed =
        JSON.parse(value);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

export async function loadBrokerResolutionLedger() {
  const raw =
    await userGetItem(
      LEDGER_KEY
    );

  return normalize(raw);
}

function buildSignature(
  event = {}
) {
  return JSON.stringify({
    discrepancyKey:
      event.discrepancyKey ||
      null,

    discrepancyType:
      event.discrepancyType ||
      null,

    symbol:
      event.symbol ||
      null,

    resolutionCode:
      event.resolutionCode ||
      null,

    gatecepQuantity:
      Number(
        event.gatecepQuantity ||
        0
      ),

    brokerQuantity:
      Number(
        event.brokerQuantity ||
        0
      ),

    gatecepValue:
      Number(
        Number(
          event.gatecepValue ||
          0
        ).toFixed(2)
      ),

    brokerValue:
      Number(
        Number(
          event.brokerValue ||
          0
        ).toFixed(2)
      )
  });
}

export async function addBrokerResolutionLedgerEvent(
  event = {}
) {
  if (!event.discrepancyKey) {
    throw new Error(
      "Resolution ledger discrepancy key is required."
    );
  }

  if (!event.resolutionCode) {
    throw new Error(
      "Resolution ledger resolution code is required."
    );
  }

  const ledger =
    await loadBrokerResolutionLedger();

  const latestForDiscrepancy =
    ledger.find(
      (item) =>
        item.discrepancyKey ===
        event.discrepancyKey
    ) || null;

  /*
   * Prevent a repeated click on the same resolution
   * from creating duplicate history.
   */
  if (
    latestForDiscrepancy &&
    buildSignature(
      latestForDiscrepancy
    ) ===
      buildSignature(event)
  ) {
    return {
      ...latestForDiscrepancy,
      ledgerAction:
        "REUSED",
      unchanged:
        true
    };
  }

  const now =
    new Date().toISOString();

  const record = {
    id:
      `BRDL-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    type:
      "BROKER_RESOLUTION_DECISION",

    discrepancyKey:
      event.discrepancyKey,

    discrepancyType:
      event.discrepancyType ||
      null,

    symbol:
      event.symbol ||
      null,

    broker:
      event.broker ||
      null,

    resolutionCode:
      event.resolutionCode,

    resolutionLabel:
      event.resolutionLabel ||
      event.resolutionCode,

    previousResolutionCode:
      latestForDiscrepancy
        ?.resolutionCode ||
      null,

    gatecepQuantity:
      Number(
        event.gatecepQuantity ||
        0
      ),

    brokerQuantity:
      Number(
        event.brokerQuantity ||
        0
      ),

    gatecepValue:
      Number(
        Number(
          event.gatecepValue ||
          0
        ).toFixed(2)
      ),

    brokerValue:
      Number(
        Number(
          event.brokerValue ||
          0
        ).toFixed(2)
      ),

    status:
      event.status ||
      "RESOLVED",

    source:
      "BROKER_RECONCILIATION",

    createdAt:
      now
  };

  const updated = [
    record,
    ...ledger
  ];

  await userSetItem(
    LEDGER_KEY,
    JSON.stringify(updated)
  );

  return {
    ...record,
    ledgerAction:
      "CREATED",
    unchanged:
      false
  };
}