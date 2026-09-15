import {
  classifyBrokerExecutionEvidence
} from "./brokerExecutionEvidencePolicy.js";

const MATCH_WINDOW_BEFORE_MS =
  24 * 60 * 60 * 1000;

const MATCH_WINDOW_AFTER_MS =
  7 * 24 * 60 * 60 * 1000;

function text(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function normalizedIdentity(value) {
  return upper(value).replace(/[^A-Z0-9]/g, "");
}

function number(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function time(value) {
  if (!value) return null;

  const next = new Date(value).getTime();

  return Number.isFinite(next)
    ? next
    : null;
}

function sameQuantity(left, right) {
  return Math.abs(number(left) - number(right)) < 0.000001;
}

function brokerIdentityMatches(order = {}, evidence = {}) {
  const evidenceBroker =
    normalizedIdentity(
      evidence?.broker ||
      evidence?.brokerName ||
      evidence?.brokerId
    );

  if (!evidenceBroker) {
    return false;
  }

  const orderBrokerIdentities = [
    order?.brokerId,
    order?.brokerName,
    order?.submissionBrokerId
  ]
    .map(normalizedIdentity)
    .filter(Boolean);

  return orderBrokerIdentities.some((candidate) => {
    if (candidate === evidenceBroker) {
      return true;
    }

    // Supports normal broker-name variations such as:
    // AIB <-> AIB-AXYS
    // ABC <-> ABC Capital
    // NCBA <-> NCBA Investment Bank
    if (
      candidate.length >= 3 &&
      evidenceBroker.includes(candidate)
    ) {
      return true;
    }

    if (
      evidenceBroker.length >= 3 &&
      candidate.includes(evidenceBroker)
    ) {
      return true;
    }

    return false;
  });
}

function evidenceWithinSubmissionWindow(order = {}, evidence = {}) {
  const submissionTime = time(
    order?.lastSubmissionAttemptAt ||
    order?.submittedAt ||
    order?.queuedAt
  );

  const executionTime = time(
    evidence?.executionDate ||
    evidence?.date
  );

  if (!submissionTime || !executionTime) {
    return false;
  }

  return (
    executionTime >=
      submissionTime - MATCH_WINDOW_BEFORE_MS &&
    executionTime <=
      submissionTime + MATCH_WINDOW_AFTER_MS
  );
}


function evidenceSubmissionDistanceMs(
  order = {},
  evidence = {}
) {
  const submissionTime = time(
    order?.lastSubmissionAttemptAt ||
    order?.submittedAt ||
    order?.queuedAt
  );

  const executionTime = time(
    evidence?.executionDate ||
    evidence?.date
  );

  if (!submissionTime || !executionTime) {
    return null;
  }

  return Math.abs(
    executionTime - submissionTime
  );
}

function evidenceMatchesOrder(order = {}, evidence = {}) {
  if (
    evidence?.canAffectRealPortfolio !== true ||
    evidence?.evidenceStatus !==
      "VERIFIED_BROKER_EXECUTION"
  ) {
    return false;
  }

  if (
    upper(evidence?.symbol) !==
    upper(order?.symbol)
  ) {
    return false;
  }

  if (
    upper(evidence?.side) !==
    upper(order?.side)
  ) {
    return false;
  }

  if (
    !sameQuantity(
      evidence?.quantity,
      order?.quantity
    )
  ) {
    return false;
  }

  if (
    !brokerIdentityMatches(order, evidence)
  ) {
    return false;
  }

  if (
    !evidenceWithinSubmissionWindow(
      order,
      evidence
    )
  ) {
    return false;
  }

  return true;
}

function verifiedRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) =>
      classifyBrokerExecutionEvidence(record)
    )
    .filter(
      (record) =>
        record?.canAffectRealPortfolio === true &&
        record?.evidenceStatus ===
          "VERIFIED_BROKER_EXECUTION"
    );
}

export function findVerifiedEvidenceMatches({
  order,
  records = []
} = {}) {
  const verified = verifiedRecords(records);

  const brokerOrderId =
    text(order?.brokerOrderId);

  // If GateCEP already has a genuine broker reference,
  // never fall back to heuristic identity matching.
  if (brokerOrderId) {
    return verified.filter(
      (record) =>
        text(record?.brokerReference) ===
        brokerOrderId
    );
  }

  return verified.filter((record) =>
    evidenceMatchesOrder(order, record)
  );
}


export function buildVerifiedEvidenceMatchAudit({
  order,
  records = []
} = {}) {
  const classified = (
    Array.isArray(records) ? records : []
  ).map((record) =>
    classifyBrokerExecutionEvidence(record)
  );

  const brokerOrderId =
    text(order?.brokerOrderId);

  const evidence = classified.map(
    (record, index) => {
      const verified =
        record?.canAffectRealPortfolio === true &&
        record?.evidenceStatus ===
          "VERIFIED_BROKER_EXECUTION";

      const referenceMatch =
        brokerOrderId
          ? text(record?.brokerReference) ===
            brokerOrderId
          : null;

      const symbolMatch =
        upper(record?.symbol) ===
        upper(order?.symbol);

      const sideMatch =
        upper(record?.side) ===
        upper(order?.side);

      const quantityMatch =
        sameQuantity(
          record?.quantity,
          order?.quantity
        );

      const brokerMatch =
        brokerIdentityMatches(
          order,
          record
        );

      const submissionWindowMatch =
        evidenceWithinSubmissionWindow(
          order,
          record
        );

      const submissionDistanceMs =
        evidenceSubmissionDistanceMs(
          order,
          record
        );

      const identitySignalCount = [
        brokerMatch,
        symbolMatch,
        sideMatch,
        quantityMatch
      ].filter(Boolean).length;

      // A12 relevance is display-only.
      // It never changes whether evidence qualifies.
      const relevanceScore =
        (referenceMatch === true ? 1000 : 0) +
        (brokerMatch ? 120 : 0) +
        (symbolMatch ? 100 : 0) +
        (sideMatch ? 80 : 0) +
        (quantityMatch ? 60 : 0) +
        (submissionWindowMatch ? 40 : 0);

      const relevant =
        referenceMatch === true ||
        identitySignalCount >= 2;

      // Preserve the exact A10 resolution rule.
      // A genuine brokerOrderId forces exact-reference
      // matching and does not fall back to heuristics.
      const qualifies =
        brokerOrderId
          ? verified && referenceMatch
          : (
              verified &&
              symbolMatch &&
              sideMatch &&
              quantityMatch &&
              brokerMatch &&
              submissionWindowMatch
            );

      return {
        id:
          record?.id ||
          record?.brokerReference ||
          `EVIDENCE-${index + 1}`,

        brokerReference:
          record?.brokerReference ||
          null,

        broker:
          record?.broker ||
          null,

        symbol:
          record?.symbol ||
          null,

        side:
          record?.side ||
          null,

        quantity:
          number(record?.quantity),

        executionDate:
          record?.executionDate ||
          record?.date ||
          null,

        executionStatus:
          record?.executionStatus ||
          record?.status ||
          null,

        evidenceStatus:
          record?.evidenceStatus ||
          "UNVERIFIED",

        missingEvidence:
          Array.isArray(
            record?.missingEvidence
          )
            ? record.missingEvidence
            : [],

        checks: {
          verified,
          referenceMatch,
          symbolMatch,
          sideMatch,
          quantityMatch,
          brokerMatch,
          submissionWindowMatch
        },

        identitySignalCount,
        submissionDistanceMs,
        relevanceScore,
        relevant,
        originalIndex: index,

        qualifies
      };
    }
  );

  const matches =
    evidence.filter(
      (item) => item.qualifies
    );

  const relevantEvidence =
    evidence
      .filter(
        (item) =>
          item.relevant ||
          item.qualifies
      )
      .sort((left, right) => {
        // Qualification remains the strongest display signal,
        // but sorting has no effect on reconciliation.
        if (
          left.qualifies !==
          right.qualifies
        ) {
          return left.qualifies
            ? -1
            : 1;
        }

        if (
          left.checks.referenceMatch !==
          right.checks.referenceMatch
        ) {
          return left.checks.referenceMatch
            ? -1
            : 1;
        }

        if (
          left.relevanceScore !==
          right.relevanceScore
        ) {
          return (
            right.relevanceScore -
            left.relevanceScore
          );
        }

        // At equal relevance, prefer verified evidence
        // over incomplete/unverified evidence.
        if (
          left.checks.verified !==
          right.checks.verified
        ) {
          return left.checks.verified
            ? -1
            : 1;
        }

        const leftDistance =
          left.submissionDistanceMs ??
          Number.MAX_SAFE_INTEGER;

        const rightDistance =
          right.submissionDistanceMs ??
          Number.MAX_SAFE_INTEGER;

        if (
          leftDistance !==
          rightDistance
        ) {
          return (
            leftDistance -
            rightDistance
          );
        }

        return (
          left.originalIndex -
          right.originalIndex
        );
      });

  const status =
    matches.length === 1
      ? "UNIQUE_VERIFIED_MATCH"
      : matches.length > 1
        ? "AMBIGUOUS_VERIFIED_MATCH"
        : "NO_VERIFIED_MATCH";

  return {
    status,

    matchMode:
      brokerOrderId
        ? "BROKER_REFERENCE"
        : "STRICT_IDENTITY_WINDOW",

    brokerOrderId:
      brokerOrderId || null,

    evidenceCount:
      evidence.length,

    verifiedEvidenceCount:
      evidence.filter(
        (item) =>
          item.checks.verified
      ).length,

    matchCount:
      matches.length,

    relevantEvidenceCount:
      relevantEvidence.length,

    hiddenIrrelevantEvidenceCount:
      Math.max(
        evidence.length -
          relevantEvidence.length,
        0
      ),

    evidence,
    relevantEvidence,

    matches
  };
}
