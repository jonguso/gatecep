import {
  userGetItem,
  userSetItem
} from "../../auth/userStorage";

const RESOLUTION_KEY =
  "practiceBrokerReconciliationResolutions";

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

export async function loadBrokerResolutions() {
  const raw =
    await userGetItem(
      RESOLUTION_KEY
    );

  return normalize(raw);
}

export async function getBrokerResolution(
  discrepancyKey
) {
  if (!discrepancyKey) {
    return null;
  }

  const resolutions =
    await loadBrokerResolutions();

  return (
    resolutions.find(
      (item) =>
        item.discrepancyKey ===
        discrepancyKey
    ) || null
  );
}

export async function saveBrokerResolution({
  discrepancyKey,
  discrepancyType,
  symbol = null,
  resolutionCode,
  resolutionLabel,
  broker = null,
  details = null
}) {
  if (!discrepancyKey) {
    throw new Error(
      "Discrepancy key is required."
    );
  }

  if (!resolutionCode) {
    throw new Error(
      "Resolution is required."
    );
  }

  const resolutions =
    await loadBrokerResolutions();

  const existing =
    resolutions.find(
      (item) =>
        item.discrepancyKey ===
        discrepancyKey
    );

  const now =
    new Date().toISOString();

  const record = {
    id:
      existing?.id ||
      `BRR-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    discrepancyKey,

    discrepancyType:
      discrepancyType ||
      null,

    symbol:
      symbol ||
      null,

    broker:
      broker ||
      null,

    resolutionCode,

    resolutionLabel:
      resolutionLabel ||
      resolutionCode,

    details:
      details ||
      null,

    status:
      resolutionCode ===
      "NEEDS_INVESTIGATION"
        ? "OPEN"
        : "RESOLVED",

    createdAt:
      existing?.createdAt ||
      now,

    updatedAt:
      now
  };

  const withoutExisting =
    resolutions.filter(
      (item) =>
        item.discrepancyKey !==
        discrepancyKey
    );

  const updated = [
    record,
    ...withoutExisting
  ];

  await userSetItem(
    RESOLUTION_KEY,
    JSON.stringify(updated)
  );

  return record;
}
