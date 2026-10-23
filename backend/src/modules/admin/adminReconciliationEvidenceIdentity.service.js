import {
  normalizeBroker
} from "../../utils/normalizeBroker.js";

function normalizeIdentifier(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function comparison({
  expected,
  actual
}) {
  const normalizedExpected =
    normalizeIdentifier(expected);

  const normalizedActual =
    normalizeIdentifier(actual);

  return {
    expected:
      normalizedExpected || null,
    actual:
      normalizedActual || null,
    present:
      Boolean(
        normalizedExpected &&
        normalizedActual
      ),
    matches:
      Boolean(
        normalizedExpected &&
        normalizedActual &&
        normalizedExpected ===
          normalizedActual
      )
  };
}

function extractBrokerFileIdentifier(fileName = "") {
  const base =
    String(fileName ?? "")
      .trim()
      .replace(/\.[^.]+$/i, "")
      .replace(/\s*\(\d+\)\s*$/i, "");

  return (
    base.match(
      /(?:^|[-_\s])(\d{5,})$/
    )?.[1] || null
  );
}

export function verifyAdminReconciliationEvidenceIdentity({
  broker,
  extraction,
  fileName = ""
} = {}) {
  const persistedBroker =
    String(broker?.broker || "")
      .trim();

  const persistedClientNumber =
    String(broker?.clientNumber || "")
      .trim();

  const persistedCdsNumber =
    String(broker?.cdsNumber || "")
      .trim();

  const identity =
    extraction?.identity &&
    typeof extraction.identity === "object"
      ? extraction.identity
      : {};

  const extractedBroker =
    String(identity.brokerId || "")
      .trim();

  const extractedClientNumber =
    String(identity.clientCode || "")
      .trim();

  const extractedCdsNumber =
    String(identity.tradingAccount || "")
      .trim();

  const brokerCheck =
    comparison({
      expected:
        persistedBroker
          ? normalizeBroker(
              persistedBroker
            )
          : "",
      actual:
        extractedBroker
          ? normalizeBroker(
              extractedBroker
            )
          : ""
    });

  const clientCheck =
    comparison({
      expected:
        persistedClientNumber,
      actual:
        extractedClientNumber
    });

  const cdsCheck =
    comparison({
      expected:
        persistedCdsNumber,
      actual:
        extractedCdsNumber
    });

  const fileIdentifier =
    extractBrokerFileIdentifier(
      fileName
    );

  const fileCdsCheck =
    comparison({
      expected:
        persistedCdsNumber,
      actual:
        fileIdentifier
    });

  const fileType =
    String(
      extraction?.fileType || ""
    )
      .trim()
      .toLowerCase();

  const structuredEvidence =
    [
      "csv",
      "xls",
      "xlsx"
    ].includes(fileType);

  const checks = {
    broker: brokerCheck,
    clientNumber: clientCheck,
    cdsNumber: cdsCheck,
    fileCdsNumber: fileCdsCheck
  };

  const missing = [];

  if (
    !persistedBroker
  ) {
    missing.push("broker");
  } else if (
    !structuredEvidence &&
    !brokerCheck.present
  ) {
    missing.push("broker");
  }

  if (
    !persistedClientNumber
  ) {
    missing.push("clientNumber");
  } else if (
    !structuredEvidence &&
    !clientCheck.present
  ) {
    missing.push("clientNumber");
  }

  if (
    !persistedCdsNumber ||
    (
      !cdsCheck.present &&
      !fileCdsCheck.present
    )
  ) {
    missing.push("cdsNumber");
  }

  const mismatches = [];

  if (
    brokerCheck.present &&
    !brokerCheck.matches
  ) {
    mismatches.push("broker");
  }

  if (
    clientCheck.present &&
    !clientCheck.matches
  ) {
    mismatches.push("clientNumber");
  }

  if (
    cdsCheck.present &&
    !cdsCheck.matches
  ) {
    mismatches.push("cdsNumber");
  }

  if (
    fileCdsCheck.present &&
    !fileCdsCheck.matches
  ) {
    mismatches.push("fileCdsNumber");
  }

  const identityVerified =
    missing.length === 0 &&
    mismatches.length === 0;

  return {
    identityVerified,
    checks,
    missing,
    mismatches
  };
}
