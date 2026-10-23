function clean(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function persistenceError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}

export function buildAdminBrokerExecutionEvidencePersistenceRecord({
  actorUserId,
  targetUserId,
  brokerLinkId,
  brokerAccountKey,
  evidence
}) {
  if (
    !actorUserId ||
    !targetUserId ||
    !brokerLinkId
  ) {
    throw persistenceError(
      "BROKER_EXECUTION_PERSISTENCE_CONTEXT_REQUIRED",
      "Actor, target, and broker-link context are required."
    );
  }

  const accountKey =
    clean(brokerAccountKey);

  if (!accountKey) {
    throw persistenceError(
      "BROKER_EXECUTION_ACCOUNT_KEY_REQUIRED",
      "Broker account key is required."
    );
  }

  if (
    !evidence ||
    evidence.evidenceStatus !==
      "CONTRACT_NOTE_VERIFIED" ||
    evidence.executionStatus !==
      "COMPLETED" ||
    evidence.canAffectRealPortfolio !==
      true ||
    evidence.economics?.economicsVerified !==
      true
  ) {
    throw persistenceError(
      "BROKER_EXECUTION_EVIDENCE_NOT_PORTFOLIO_READY",
      "Only verified completed execution evidence may be portfolio-ready."
    );
  }

  if (
    !Number.isInteger(
      evidence.source?.pageNumber
    ) ||
    evidence.source.pageNumber <= 0
  ) {
    throw persistenceError(
      "BROKER_EXECUTION_SOURCE_PAGE_INVALID",
      "Contract-note source page must be a positive integer."
    );
  }

  return {
    actorUserId,
    targetUserId,
    brokerLinkId,
    brokerAccountKey:
      accountKey,

    sourceFileName:
      evidence.source.fileName,

    sourceFileSha256:
      evidence.source.fileSha256,

    // For PDF contract notes, migration 016's
    // source_row_number stores the 1-based page number.
    sourceRowNumber:
      evidence.source.pageNumber,

    executionIdentity:
      evidence.executionIdentity,

    // A contract-note summary may represent multiple
    // underlying orders/contracts. Do not fabricate a
    // single scalar broker/fill reference.
    brokerReference:
      null,

    fillReference:
      null,

    symbol:
      evidence.symbol,

    side:
      evidence.side,

    executedQuantity:
      evidence.executedQuantity,

    executionPrice:
      evidence.executionPrice,

    executionDate:
      evidence.executionDate,

    settlementDate:
      evidence.settlementDate,

    totalFees:
      evidence.totalFees,

    executionStatus:
      evidence.executionStatus,

    evidenceStatus:
      evidence.evidenceStatus,

    canAffectRealPortfolio:
      true,

    rawEvidence: {
      ...evidence.rawEvidence,

      brokerIdentity:
        evidence.brokerIdentity,

      economics:
        evidence.economics
    },

    verificationMetadata: {
      correlation:
        evidence.correlation,

      sourceType:
        "CONTRACT_NOTE_PDF",

      authoritativeExecutionUnit:
        "CONTRACT_NOTE_PAGE_SECURITY_SUMMARY"
    }
  };
}

function comparableNumber(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    !value.trim()
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function numericEqual(left, right) {
  const a =
    comparableNumber(left);

  const b =
    comparableNumber(right);

  return (
    a !== null &&
    b !== null &&
    Math.abs(a - b) < 0.000001
  );
}

function sameText(left, right) {
  return clean(left) === clean(right);
}

function canonicalDate(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      return "";
    }

    return value
      .toISOString()
      .slice(0, 10);
  }

  const text =
    clean(value);

  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const match =
    text.match(
      /^(\d{2})-([A-Za-z]{3})-(\d{4})$/
    );

  if (!match) {
    return "";
  }

  const months = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12"
  };

  const month =
    months[
      match[2].toUpperCase()
    ];

  if (!month) {
    return "";
  }

  return (
    match[3] +
    "-" +
    month +
    "-" +
    match[1]
  );
}

function sameDate(left, right) {
  const a =
    canonicalDate(left);

  const b =
    canonicalDate(right);

  return (
    Boolean(a) &&
    Boolean(b) &&
    a === b
  );
}

export function isEquivalentAdminBrokerExecutionEvidence(
  existing,
  candidate
) {
  if (!existing || !candidate) {
    return false;
  }

  const existingBroker =
    existing.rawEvidence?.brokerIdentity ?? {};

  const candidateBroker =
    candidate.rawEvidence?.brokerIdentity ?? {};

  const existingEconomics =
    existing.rawEvidence?.economics ?? {};

  const candidateEconomics =
    candidate.rawEvidence?.economics ?? {};

  return (
    sameText(
      existing.executionIdentity,
      candidate.executionIdentity
    ) &&

    sameText(
      existing.brokerAccountKey,
      candidate.brokerAccountKey
    ) &&

    sameText(
      existing.symbol,
      candidate.symbol
    ) &&

    sameText(
      existing.side,
      candidate.side
    ) &&

    numericEqual(
      existing.executedQuantity,
      candidate.executedQuantity
    ) &&

    numericEqual(
      existing.executionPrice,
      candidate.executionPrice
    ) &&

    sameDate(
      existing.executionDate,
      candidate.executionDate
    ) &&

    sameDate(
      existing.settlementDate,
      candidate.settlementDate
    ) &&

    numericEqual(
      existing.totalFees,
      candidate.totalFees
    ) &&

    sameText(
      existing.executionStatus,
      candidate.executionStatus
    ) &&

    sameText(
      existing.evidenceStatus,
      candidate.evidenceStatus
    ) &&

    existing.canAffectRealPortfolio ===
      candidate.canAffectRealPortfolio &&

    sameText(
      existingBroker.broker,
      candidateBroker.broker
    ) &&

    sameText(
      existingBroker.clientCode,
      candidateBroker.clientCode
    ) &&

    sameText(
      existingBroker.tradingAccount,
      candidateBroker.tradingAccount
    ) &&

    numericEqual(
      existingEconomics.grossConsideration,
      candidateEconomics.grossConsideration
    ) &&

    numericEqual(
      existingEconomics.totalCharges,
      candidateEconomics.totalCharges
    ) &&

    numericEqual(
      existingEconomics.netAmount,
      candidateEconomics.netAmount
    ) &&

    sameText(
      existingEconomics.netAmountType,
      candidateEconomics.netAmountType
    ) &&

    existingEconomics.economicsVerified ===
      true &&

    candidateEconomics.economicsVerified ===
      true
  );
}

export async function persistAdminBrokerExecutionEvidenceIdempotently({
  record,
  queryable
}) {
  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw persistenceError(
      "BROKER_EXECUTION_PERSISTENCE_QUERYABLE_REQUIRED",
      "A transactional database client is required."
    );
  }

  if (!record) {
    throw persistenceError(
      "BROKER_EXECUTION_PERSISTENCE_RECORD_REQUIRED",
      "Execution evidence persistence record is required."
    );
  }

  const {
    createAdminBrokerExecutionEvidenceIfAbsent,
    findAdminBrokerExecutionEvidenceByIdentity
  } =
    await import(
      "./adminBrokerExecutionEvidence.repository.js"
    );

  const identityContext = {
    targetUserId:
      record.targetUserId,

    brokerLinkId:
      record.brokerLinkId,

    brokerAccountKey:
      record.brokerAccountKey,

    executionIdentity:
      record.executionIdentity
  };

  /*
   * Fast replay path.
   */
  const existing =
    await findAdminBrokerExecutionEvidenceByIdentity(
      identityContext,
      queryable
    );

  if (existing) {
    if (
      !isEquivalentAdminBrokerExecutionEvidence(
        existing,
        record
      )
    ) {
      throw persistenceError(
        "BROKER_EXECUTION_REPLAY_CONFLICT",
        "Existing execution identity conflicts with the candidate evidence."
      );
    }

    return {
      created: false,
      evidence: existing
    };
  }

  /*
   * The database unique constraint remains the final
   * concurrency guard. INSERT ... ON CONFLICT DO NOTHING
   * returns the created row for the winner and null for
   * a concurrent/replayed loser.
   */
  const created =
    await createAdminBrokerExecutionEvidenceIfAbsent(
      record,
      queryable
    );

  if (created) {
    return {
      created: true,
      evidence: created
    };
  }

  /*
   * Another writer won the unique identity.
   * Resolve that persisted winner and compare its
   * canonical economics before accepting the replay.
   */
  const winner =
    await findAdminBrokerExecutionEvidenceByIdentity(
      identityContext,
      queryable
    );

  if (!winner) {
    throw persistenceError(
      "BROKER_EXECUTION_DUPLICATE_UNRESOLVED",
      "Execution identity collided but the persisted evidence could not be resolved."
    );
  }

  if (
    !isEquivalentAdminBrokerExecutionEvidence(
      winner,
      record
    )
  ) {
    throw persistenceError(
      "BROKER_EXECUTION_REPLAY_CONFLICT",
      "Existing execution identity conflicts with the candidate evidence."
    );
  }

  return {
    created: false,
    evidence: winner
  };
}
