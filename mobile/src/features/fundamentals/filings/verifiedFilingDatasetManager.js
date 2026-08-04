import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  mergeCompanyFundamentals,
  normalizeCompanyFundamentals,
  normalizeFundamentalDataSource
} from "../fundamentalDataEngine";

import {
  mergeAndSaveFundamentalRecord
} from "../fundamentalRepository";

/*
 * ============================================================
 * PC-025B
 * VERIFIED FILING DATASET MANAGER
 * ============================================================
 *
 * Tracks:
 *
 * - filing source documents,
 * - filing type and fiscal period,
 * - verification and approval status,
 * - duplicate filings,
 * - superseded and revised filings,
 * - rejection reasons,
 * - review notes,
 * - approved records promoted into the main repository.
 *
 * Safeguards:
 *
 * - does not fabricate financial values,
 * - does not approve records automatically,
 * - does not overwrite approved filings silently,
 * - preserves revision history and source provenance,
 * - promotes only approved filings.
 * ============================================================
 */

export const VERIFIED_FILING_SCHEMA_VERSION = 1;

export const VERIFIED_FILING_STATUSES = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  VERIFIED: "VERIFIED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUPERSEDED: "SUPERSEDED",
  ARCHIVED: "ARCHIVED"
};

export const VERIFIED_FILING_TYPES = {
  ANNUAL_REPORT: "ANNUAL_REPORT",
  AUDITED_FINANCIALS: "AUDITED_FINANCIALS",
  INTERIM_REPORT: "INTERIM_REPORT",
  QUARTERLY_REPORT: "QUARTERLY_REPORT",
  DIVIDEND_NOTICE: "DIVIDEND_NOTICE",
  EARNINGS_RELEASE: "EARNINGS_RELEASE",
  EXCHANGE_ANNOUNCEMENT: "EXCHANGE_ANNOUNCEMENT",
  REGULATORY_FILING: "REGULATORY_FILING",
  BROKER_RESEARCH: "BROKER_RESEARCH",
  OTHER: "OTHER"
};

export const VERIFIED_FILING_REVIEW_ACTIONS = {
  SUBMIT: "SUBMIT",
  VERIFY: "VERIFY",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  SUPERSEDE: "SUPERSEDE",
  ARCHIVE: "ARCHIVE",
  RESTORE: "RESTORE"
};

export const VERIFIED_FILING_DUPLICATE_STATUSES = {
  UNIQUE: "UNIQUE",
  POSSIBLE_DUPLICATE: "POSSIBLE_DUPLICATE",
  EXACT_DUPLICATE: "EXACT_DUPLICATE",
  REVISION: "REVISION"
};

export const VERIFIED_FILING_KEYS = {
  RECORDS:
    "@gatecep/fundamentals/filings/records/v1",

  METADATA:
    "@gatecep/fundamentals/filings/metadata/v1"
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeText(value) {
  return String(value || "")
    .trim();
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function normalizeSymbol(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date.toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = "FILING") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

function nullableNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function hashString(value) {
  const text = String(value || "");
  let hash = 0;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    hash =
      (
        hash * 31 +
        text.charCodeAt(index)
      ) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function stableStringify(value) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .map(stableStringify)
      .join(",")}]`;
  }

  const keys =
    Object.keys(value).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify(
          value[key]
        )}`
    )
    .join(",")}}`;
}

function buildContentHash({
  symbol,
  fiscalYear,
  filingType,
  periodEnd,
  company
}) {
  return hashString(
    stableStringify({
      symbol:
        normalizeSymbol(symbol),

      fiscalYear:
        fiscalYear ?? null,

      filingType:
        normalizeCode(filingType),

      periodEnd:
        normalizeDate(periodEnd),

      company:
        normalizeCompanyFundamentals(
          company || {}
        )
    })
  );
}

function buildDefaultMetadata() {
  return {
    schemaVersion:
      VERIFIED_FILING_SCHEMA_VERSION,

    createdAt:
      nowIso(),

    updatedAt:
      nowIso(),

    total:
      0,

    approved:
      0,

    pendingReview:
      0
  };
}

async function readJson(
  key,
  fallback
) {
  try {
    const stored =
      await AsyncStorage.getItem(key);

    return stored
      ? JSON.parse(stored)
      : fallback;
  } catch (error) {
    console.warn(
      `Unable to read ${key}:`,
      error
    );

    return fallback;
  }
}

async function writeJson(
  key,
  value
) {
  await AsyncStorage.setItem(
    key,
    JSON.stringify(value)
  );

  return value;
}

function normalizeReviewer(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value === "string"
  ) {
    return {
      id:
        value,

      name:
        value
    };
  }

  return {
    id:
      value?.id ||
      value?.email ||
      value?.name ||
      null,

    name:
      value?.name ||
      value?.email ||
      value?.id ||
      "Unknown Reviewer",

    email:
      value?.email ||
      null
  };
}

export function normalizeVerifiedFiling(
  filing = {}
) {
  const company =
    normalizeCompanyFundamentals(
      filing?.company ||
      filing?.fundamentals ||
      {
        ...filing,

        periods:
          filing?.periods
      }
    );

  const fiscalYear =
    filing?.fiscalYear ??
    company?.latestPeriod?.fiscalYear ??
    null;

  const periodEnd =
    normalizeDate(
      filing?.periodEnd ??
      company?.latestPeriod?.periodEnd
    );

  const filingType =
    normalizeCode(
      filing?.filingType ||
      VERIFIED_FILING_TYPES
        .OTHER
    );

  const contentHash =
    filing?.contentHash ||
    buildContentHash({
      symbol:
        company.symbol,

      fiscalYear,

      filingType,

      periodEnd,

      company
    });

  return {
    id:
      filing?.id ||
      createId(),

    symbol:
      normalizeSymbol(
        filing?.symbol ||
        company.symbol
      ),

    companyName:
      normalizeText(
        filing?.companyName ||
        company.name ||
        filing?.symbol
      ),

    filingType,

    fiscalYear:
      fiscalYear === null
        ? null
        : Number(fiscalYear),

    periodStart:
      normalizeDate(
        filing?.periodStart
      ),

    periodEnd,

    publicationDate:
      normalizeDate(
        filing?.publicationDate ||
        filing?.publishedAt
      ),

    receivedAt:
      normalizeDate(
        filing?.receivedAt ||
        new Date()
      ),

    status:
      normalizeCode(
        filing?.status ||
        VERIFIED_FILING_STATUSES
          .DRAFT
      ),

    revisionNumber:
      Math.max(
        Number(
          filing?.revisionNumber ??
          1
        ) || 1,
        1
      ),

    supersedesFilingId:
      filing?.supersedesFilingId ||
      null,

    supersededByFilingId:
      filing?.supersededByFilingId ||
      null,

    duplicateStatus:
      normalizeCode(
        filing?.duplicateStatus ||
        VERIFIED_FILING_DUPLICATE_STATUSES
          .UNIQUE
      ),

    duplicateOfFilingId:
      filing?.duplicateOfFilingId ||
      null,

    sourceDocument: {
      fileName:
        filing
          ?.sourceDocument
          ?.fileName ||
        filing?.fileName ||
        null,

      fileUri:
        filing
          ?.sourceDocument
          ?.fileUri ||
        filing?.fileUri ||
        null,

      mimeType:
        filing
          ?.sourceDocument
          ?.mimeType ||
        filing?.mimeType ||
        null,

      pageCount:
        nullableNumber(
          filing
            ?.sourceDocument
            ?.pageCount
        ),

      checksum:
        filing
          ?.sourceDocument
          ?.checksum ||
        null,

      source:
        normalizeFundamentalDataSource(
          filing
            ?.sourceDocument
            ?.source ||
          filing?.source ||
          {}
        )
    },

    contentHash,

    company,

    review: {
      submittedAt:
        normalizeDate(
          filing
            ?.review
            ?.submittedAt
        ),

      submittedBy:
        normalizeReviewer(
          filing
            ?.review
            ?.submittedBy
        ),

      verifiedAt:
        normalizeDate(
          filing
            ?.review
            ?.verifiedAt
        ),

      verifiedBy:
        normalizeReviewer(
          filing
            ?.review
            ?.verifiedBy
        ),

      approvedAt:
        normalizeDate(
          filing
            ?.review
            ?.approvedAt
        ),

      approvedBy:
        normalizeReviewer(
          filing
            ?.review
            ?.approvedBy
        ),

      rejectedAt:
        normalizeDate(
          filing
            ?.review
            ?.rejectedAt
        ),

      rejectedBy:
        normalizeReviewer(
          filing
            ?.review
            ?.rejectedBy
        ),

      rejectionReason:
        normalizeText(
          filing
            ?.review
            ?.rejectionReason
        ) ||
        null,

      notes:
        safeArray(
          filing
            ?.review
            ?.notes
        )
    },

    auditTrail:
      safeArray(
        filing?.auditTrail
      ),

    createdAt:
      normalizeDate(
        filing?.createdAt ||
        new Date()
      ),

    updatedAt:
      normalizeDate(
        filing?.updatedAt ||
        new Date()
      ),

    metadata:
      filing?.metadata &&
      typeof filing.metadata ===
        "object"
        ? filing.metadata
        : {}
  };
}

export async function loadVerifiedFilingMetadata() {
  const metadata =
    await readJson(
      VERIFIED_FILING_KEYS
        .METADATA,
      buildDefaultMetadata()
    );

  return {
    ...buildDefaultMetadata(),
    ...metadata,
    schemaVersion:
      VERIFIED_FILING_SCHEMA_VERSION
  };
}

export async function loadVerifiedFilings() {
  const filings =
    await readJson(
      VERIFIED_FILING_KEYS
        .RECORDS,
      []
    );

  return safeArray(filings)
    .map(
      normalizeVerifiedFiling
    );
}

async function persistVerifiedFilings(
  filings
) {
  const normalized =
    safeArray(filings)
      .map(
        normalizeVerifiedFiling
      );

  await writeJson(
    VERIFIED_FILING_KEYS
      .RECORDS,
    normalized
  );

  const metadata =
    await loadVerifiedFilingMetadata();

  await writeJson(
    VERIFIED_FILING_KEYS
      .METADATA,
    {
      ...metadata,

      schemaVersion:
        VERIFIED_FILING_SCHEMA_VERSION,

      updatedAt:
        nowIso(),

      total:
        normalized.length,

      approved:
        normalized.filter(
          (filing) =>
            filing.status ===
            VERIFIED_FILING_STATUSES
              .APPROVED
        ).length,

      pendingReview:
        normalized.filter(
          (filing) =>
            filing.status ===
              VERIFIED_FILING_STATUSES
                .PENDING_REVIEW ||
            filing.status ===
              VERIFIED_FILING_STATUSES
                .VERIFIED
        ).length
    }
  );

  return normalized;
}

export async function loadVerifiedFiling(
  id
) {
  const filings =
    await loadVerifiedFilings();

  return filings.find(
    (filing) =>
      filing.id === id
  ) || null;
}

export async function detectVerifiedFilingDuplicate({
  filing,
  filings = null
} = {}) {
  const candidate =
    normalizeVerifiedFiling(filing);

  const repository =
    filings ||
    await loadVerifiedFilings();

  const exact =
    repository.find(
      (existing) =>
        existing.id !==
          candidate.id &&
        existing.contentHash ===
          candidate.contentHash
    );

  if (exact) {
    return {
      status:
        VERIFIED_FILING_DUPLICATE_STATUSES
          .EXACT_DUPLICATE,

      filingId:
        exact.id,

      reason:
        "Matching content hash."
    };
  }

  const samePeriod =
    repository
      .filter(
        (existing) =>
          existing.id !==
            candidate.id &&
          existing.symbol ===
            candidate.symbol &&
          existing.fiscalYear ===
            candidate.fiscalYear &&
          existing.filingType ===
            candidate.filingType
      )
      .sort(
        (first, second) =>
          second.revisionNumber -
          first.revisionNumber
      );

  if (samePeriod.length) {
    const latest =
      samePeriod[0];

    return {
      status:
        candidate.revisionNumber >
        latest.revisionNumber
          ? VERIFIED_FILING_DUPLICATE_STATUSES
              .REVISION
          : VERIFIED_FILING_DUPLICATE_STATUSES
              .POSSIBLE_DUPLICATE,

      filingId:
        latest.id,

      reason:
        "Same symbol, fiscal year, and filing type."
    };
  }

  return {
    status:
      VERIFIED_FILING_DUPLICATE_STATUSES
        .UNIQUE,

    filingId:
      null,

    reason:
      null
  };
}

function appendAuditEvent({
  filing,
  action,
  actor,
  note = null
}) {
  return {
    ...filing,

    auditTrail: [
      ...safeArray(
        filing.auditTrail
      ),
      {
        id:
          createId("AUDIT"),

        action:
          normalizeCode(action),

        actor:
          normalizeReviewer(actor),

        note:
          normalizeText(note) ||
          null,

        timestamp:
          nowIso()
      }
    ],

    updatedAt:
      nowIso()
  };
}

export async function saveVerifiedFiling({
  filing,
  actor = null,
  note = null
} = {}) {
  let normalized =
    normalizeVerifiedFiling(
      filing
    );

  const filings =
    await loadVerifiedFilings();

  const duplicate =
    await detectVerifiedFilingDuplicate({
      filing:
        normalized,

      filings
    });

  normalized = {
    ...normalized,

    duplicateStatus:
      duplicate.status,

    duplicateOfFilingId:
      duplicate.filingId
  };

  normalized =
    appendAuditEvent({
      filing:
        normalized,

      action:
        "SAVE",

      actor,

      note
    });

  const index =
    filings.findIndex(
      (item) =>
        item.id ===
        normalized.id
    );

  if (index >= 0) {
    filings[index] =
      normalized;
  } else {
    filings.push(
      normalized
    );
  }

  await persistVerifiedFilings(
    filings
  );

  return normalized;
}

export async function createVerifiedFiling({
  filing,
  actor = null
} = {}) {
  return saveVerifiedFiling({
    filing: {
      ...filing,

      id:
        filing?.id ||
        createId(),

      status:
        filing?.status ||
        VERIFIED_FILING_STATUSES
          .DRAFT
    },

    actor,

    note:
      "Verified filing record created."
  });
}

export async function submitVerifiedFilingForReview({
  filingId,
  reviewer = null,
  note = null
} = {}) {
  return updateVerifiedFilingStatus({
    filingId,

    action:
      VERIFIED_FILING_REVIEW_ACTIONS
        .SUBMIT,

    actor:
      reviewer,

    note
  });
}

export async function verifyVerifiedFiling({
  filingId,
  reviewer,
  note = null
} = {}) {
  return updateVerifiedFilingStatus({
    filingId,

    action:
      VERIFIED_FILING_REVIEW_ACTIONS
        .VERIFY,

    actor:
      reviewer,

    note
  });
}

export async function approveVerifiedFiling({
  filingId,
  reviewer,
  note = null,
  promote = true
} = {}) {
  const filing =
    await updateVerifiedFilingStatus({
      filingId,

      action:
        VERIFIED_FILING_REVIEW_ACTIONS
          .APPROVE,

      actor:
        reviewer,

      note
    });

  if (
    promote &&
    filing
  ) {
    await promoteApprovedVerifiedFiling({
      filingId:
        filing.id
    });
  }

  return filing;
}

export async function rejectVerifiedFiling({
  filingId,
  reviewer,
  reason,
  note = null
} = {}) {
  return updateVerifiedFilingStatus({
    filingId,

    action:
      VERIFIED_FILING_REVIEW_ACTIONS
        .REJECT,

    actor:
      reviewer,

    note:
      note ||
      reason,

    rejectionReason:
      reason
  });
}

export async function updateVerifiedFilingStatus({
  filingId,
  action,
  actor,
  note = null,
  rejectionReason = null
} = {}) {
  const filings =
    await loadVerifiedFilings();

  const index =
    filings.findIndex(
      (filing) =>
        filing.id ===
        filingId
    );

  if (index < 0) {
    throw new Error(
      "Verified filing was not found."
    );
  }

  let filing =
    filings[index];

  const normalizedAction =
    normalizeCode(action);

  const review = {
    ...filing.review
  };

  let status =
    filing.status;

  if (
    normalizedAction ===
    VERIFIED_FILING_REVIEW_ACTIONS
      .SUBMIT
  ) {
    status =
      VERIFIED_FILING_STATUSES
        .PENDING_REVIEW;

    review.submittedAt =
      nowIso();

    review.submittedBy =
      normalizeReviewer(actor);
  } else if (
    normalizedAction ===
    VERIFIED_FILING_REVIEW_ACTIONS
      .VERIFY
  ) {
    status =
      VERIFIED_FILING_STATUSES
        .VERIFIED;

    review.verifiedAt =
      nowIso();

    review.verifiedBy =
      normalizeReviewer(actor);
  } else if (
    normalizedAction ===
    VERIFIED_FILING_REVIEW_ACTIONS
      .APPROVE
  ) {
    status =
      VERIFIED_FILING_STATUSES
        .APPROVED;

    review.approvedAt =
      nowIso();

    review.approvedBy =
      normalizeReviewer(actor);
  } else if (
    normalizedAction ===
    VERIFIED_FILING_REVIEW_ACTIONS
      .REJECT
  ) {
    status =
      VERIFIED_FILING_STATUSES
        .REJECTED;

    review.rejectedAt =
      nowIso();

    review.rejectedBy =
      normalizeReviewer(actor);

    review.rejectionReason =
      normalizeText(
        rejectionReason
      ) ||
      "No rejection reason supplied.";
  } else if (
    normalizedAction ===
    VERIFIED_FILING_REVIEW_ACTIONS
      .ARCHIVE
  ) {
    status =
      VERIFIED_FILING_STATUSES
        .ARCHIVED;
  } else if (
    normalizedAction ===
    VERIFIED_FILING_REVIEW_ACTIONS
      .RESTORE
  ) {
    status =
      VERIFIED_FILING_STATUSES
        .DRAFT;
  } else {
    throw new Error(
      `Unsupported filing review action: ${normalizedAction}.`
    );
  }

  if (note) {
    review.notes = [
      ...safeArray(
        review.notes
      ),
      {
        id:
          createId("NOTE"),

        note:
          normalizeText(note),

        actor:
          normalizeReviewer(actor),

        timestamp:
          nowIso()
      }
    ];
  }

  filing = {
    ...filing,

    status,

    review
  };

  filing =
    appendAuditEvent({
      filing,

      action:
        normalizedAction,

      actor,

      note
    });

  filings[index] =
    filing;

  await persistVerifiedFilings(
    filings
  );

  return filing;
}

export async function createVerifiedFilingRevision({
  filingId,
  revisedFiling,
  actor,
  note = null
} = {}) {
  const filings =
    await loadVerifiedFilings();

  const original =
    filings.find(
      (filing) =>
        filing.id ===
        filingId
    );

  if (!original) {
    throw new Error(
      "Original filing was not found."
    );
  }

  let revision =
    normalizeVerifiedFiling({
      ...revisedFiling,

      id:
        createId(),

      symbol:
        revisedFiling?.symbol ||
        original.symbol,

      companyName:
        revisedFiling?.companyName ||
        original.companyName,

      filingType:
        revisedFiling?.filingType ||
        original.filingType,

      fiscalYear:
        revisedFiling?.fiscalYear ??
        original.fiscalYear,

      revisionNumber:
        original.revisionNumber +
        1,

      supersedesFilingId:
        original.id,

      status:
        VERIFIED_FILING_STATUSES
          .DRAFT,

      duplicateStatus:
        VERIFIED_FILING_DUPLICATE_STATUSES
          .REVISION
    });

  revision =
    appendAuditEvent({
      filing:
        revision,

      action:
        "CREATE_REVISION",

      actor,

      note
    });

  const originalIndex =
    filings.findIndex(
      (filing) =>
        filing.id ===
        original.id
    );

  filings[originalIndex] = {
    ...appendAuditEvent({
      filing: {
        ...original,

        status:
          VERIFIED_FILING_STATUSES
            .SUPERSEDED,

        supersededByFilingId:
          revision.id
      },

      action:
        VERIFIED_FILING_REVIEW_ACTIONS
          .SUPERSEDE,

      actor,

      note:
        note ||
        `Superseded by revision ${revision.revisionNumber}.`
    })
  };

  filings.push(
    revision
  );

  await persistVerifiedFilings(
    filings
  );

  return {
    original:
      filings[originalIndex],

    revision
  };
}

export async function promoteApprovedVerifiedFiling({
  filingId
} = {}) {
  const filing =
    await loadVerifiedFiling(
      filingId
    );

  if (!filing) {
    throw new Error(
      "Verified filing was not found."
    );
  }

  if (
    filing.status !==
    VERIFIED_FILING_STATUSES
      .APPROVED
  ) {
    throw new Error(
      "Only approved filings can be promoted."
    );
  }

  return mergeAndSaveFundamentalRecord({
    symbol:
      filing.symbol,

    incoming: {
      ...filing.company,

      symbol:
        filing.symbol,

      name:
        filing.companyName,

      sources: [
        ...safeArray(
          filing.company?.sources
        ),

        filing.sourceDocument?.source
      ].filter(Boolean),

      metadata: {
        ...(filing.company?.metadata || {}),

        approvedFilingId:
          filing.id,

        approvedFilingRevision:
          filing.revisionNumber,

        approvedAt:
          filing.review?.approvedAt,

        approvedBy:
          filing.review?.approvedBy
      }
    }
  });
}

export async function loadVerifiedFilingsBySymbol(
  symbol
) {
  const target =
    normalizeSymbol(symbol);

  const filings =
    await loadVerifiedFilings();

  return filings
    .filter(
      (filing) =>
        filing.symbol ===
        target
    )
    .sort(
      (first, second) =>
        (
          Number(second.fiscalYear || 0) -
          Number(first.fiscalYear || 0)
        ) ||
        (
          second.revisionNumber -
          first.revisionNumber
        )
    );
}

export async function loadPendingVerifiedFilings() {
  const filings =
    await loadVerifiedFilings();

  return filings.filter(
    (filing) =>
      filing.status ===
        VERIFIED_FILING_STATUSES
          .PENDING_REVIEW ||
      filing.status ===
        VERIFIED_FILING_STATUSES
          .VERIFIED
  );
}

export async function loadApprovedVerifiedFilings() {
  const filings =
    await loadVerifiedFilings();

  return filings.filter(
    (filing) =>
      filing.status ===
      VERIFIED_FILING_STATUSES
        .APPROVED
  );
}

export async function loadDuplicateVerifiedFilings() {
  const filings =
    await loadVerifiedFilings();

  return filings.filter(
    (filing) =>
      filing.duplicateStatus !==
      VERIFIED_FILING_DUPLICATE_STATUSES
        .UNIQUE
  );
}

export async function deleteVerifiedFiling(
  filingId
) {
  const filings =
    await loadVerifiedFilings();

  const next =
    filings.filter(
      (filing) =>
        filing.id !==
        filingId
    );

  if (
    next.length ===
    filings.length
  ) {
    return false;
  }

  await persistVerifiedFilings(
    next
  );

  return true;
}

export async function clearVerifiedFilingRepository() {
  await AsyncStorage.multiRemove([
    VERIFIED_FILING_KEYS
      .RECORDS,

    VERIFIED_FILING_KEYS
      .METADATA
  ]);

  return true;
}

export async function buildVerifiedFilingSummary() {
  const filings =
    await loadVerifiedFilings();

  return {
    total:
      filings.length,

    draft:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .DRAFT
      ).length,

    pendingReview:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .PENDING_REVIEW
      ).length,

    verified:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .VERIFIED
      ).length,

    approved:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .APPROVED
      ).length,

    rejected:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .REJECTED
      ).length,

    superseded:
      filings.filter(
        (filing) =>
          filing.status ===
          VERIFIED_FILING_STATUSES
            .SUPERSEDED
      ).length,

    duplicates:
      filings.filter(
        (filing) =>
          filing.duplicateStatus !==
          VERIFIED_FILING_DUPLICATE_STATUSES
            .UNIQUE
      ).length,

    symbols:
      Array.from(
        new Set(
          filings.map(
            (filing) =>
              filing.symbol
          )
        )
      )
  };
}
