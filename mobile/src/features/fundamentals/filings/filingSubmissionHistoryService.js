import AsyncStorage from "@react-native-async-storage/async-storage";

/*
 * ============================================================
 * PC-025H
 * FILING SUBMISSION HISTORY SERVICE
 * ============================================================
 *
 * Persists:
 *
 * - successful submission receipts,
 * - failed and blocked submissions,
 * - retry attempts,
 * - duplicate-resolution decisions,
 * - filing links,
 * - source workspace and submission mode,
 * - payload snapshots needed for controlled retry.
 * ============================================================
 */

export const FILING_SUBMISSION_HISTORY_SCHEMA_VERSION = 1;

export const FILING_SUBMISSION_HISTORY_STATUSES = {
  SUBMITTED: "SUBMITTED",
  FAILED: "FAILED",
  INVALID: "INVALID",
  DUPLICATE_REVIEW_REQUIRED:
    "DUPLICATE_REVIEW_REQUIRED",
  RETRYING: "RETRYING",
  RESOLVED: "RESOLVED",
  ARCHIVED: "ARCHIVED"
};

export const FILING_DUPLICATE_RESOLUTIONS = {
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
  OVERRIDE_AND_SUBMIT:
    "OVERRIDE_AND_SUBMIT",
  LINK_EXISTING: "LINK_EXISTING"
};

export const FILING_SUBMISSION_HISTORY_KEYS = {
  RECORDS:
    "@gatecep/fundamentals/filing-submission-history/records/v1",

  METADATA:
    "@gatecep/fundamentals/filing-submission-history/metadata/v1"
};

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeCode(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");
}

function normalizeText(value) {
  return String(value || "")
    .trim();
}

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return `SUBMISSION-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

function normalizeActor(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
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
      "Unknown User",

    email:
      value?.email ||
      null
  };
}

function buildDefaultMetadata() {
  return {
    schemaVersion:
      FILING_SUBMISSION_HISTORY_SCHEMA_VERSION,

    createdAt:
      nowIso(),

    updatedAt:
      nowIso(),

    total:
      0
  };
}

async function readJson(
  key,
  fallback
) {
  try {
    const stored =
      await AsyncStorage.getItem(
        key
      );

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

function deriveHistoryStatus(
  result
) {
  if (
    result?.submitted ||
    result?.status ===
      "SUBMITTED"
  ) {
    return FILING_SUBMISSION_HISTORY_STATUSES
      .SUBMITTED;
  }

  if (
    result?.status ===
    "DUPLICATE_REVIEW_REQUIRED"
  ) {
    return FILING_SUBMISSION_HISTORY_STATUSES
      .DUPLICATE_REVIEW_REQUIRED;
  }

  if (
    result?.status ===
    "INVALID"
  ) {
    return FILING_SUBMISSION_HISTORY_STATUSES
      .INVALID;
  }

  return FILING_SUBMISSION_HISTORY_STATUSES
    .FAILED;
}

export function normalizeFilingSubmissionHistoryEntry(
  entry = {}
) {
  return {
    id:
      entry?.id ||
      createId(),

    receiptId:
      entry?.receiptId ||
      entry?.receipt?.id ||
      null,

    filingId:
      entry?.filingId ||
      entry?.receipt?.filingId ||
      entry?.filing?.id ||
      null,

    symbol:
      String(
        entry?.symbol ||
        entry?.receipt?.symbol ||
        entry?.validation?.symbol ||
        entry?.payload?.symbol ||
        entry?.payload?.company?.symbol ||
        ""
      )
        .trim()
        .toUpperCase(),

    companyName:
      normalizeText(
        entry?.companyName ||
        entry?.payload?.companyName ||
        entry?.payload?.company?.name
      ) ||
      null,

    historyStatus:
      normalizeCode(
        entry?.historyStatus ||
        deriveHistoryStatus(
          entry?.result ||
          entry
        )
      ),

    bridgeStatus:
      normalizeCode(
        entry?.bridgeStatus ||
        entry?.result?.status ||
        entry?.status ||
        "UNKNOWN"
      ),

    filingStatus:
      normalizeCode(
        entry?.filingStatus ||
        entry?.receipt?.status ||
        entry?.filing?.status ||
        "UNKNOWN"
      ),

    sourceWorkspace:
      normalizeCode(
        entry?.sourceWorkspace ||
        entry?.request?.sourceWorkspace ||
        entry?.receipt?.sourceWorkspace ||
        "EXTERNAL"
      ),

    submissionMode:
      normalizeCode(
        entry?.submissionMode ||
        entry?.request?.submissionMode ||
        entry?.receipt?.submissionMode ||
        "CREATE_DRAFT"
      ),

    duplicateStatus:
      normalizeCode(
        entry?.duplicateStatus ||
        entry?.duplicate?.status ||
        entry?.receipt?.duplicateStatus ||
        "UNIQUE"
      ),

    duplicateOfFilingId:
      entry?.duplicateOfFilingId ||
      entry?.duplicate?.filingId ||
      null,

    duplicateResolution:
      normalizeCode(
        entry?.duplicateResolution ||
        FILING_DUPLICATE_RESOLUTIONS
          .PENDING
      ),

    duplicateResolutionNote:
      normalizeText(
        entry?.duplicateResolutionNote
      ) ||
      null,

    submitted:
      Boolean(
        entry?.submitted ??
        entry?.result?.submitted
      ),

    submittedBy:
      normalizeActor(
        entry?.submittedBy ||
        entry?.request?.actor ||
        entry?.receipt?.submittedBy
      ),

    submittedAt:
      entry?.submittedAt ||
      entry?.receipt?.submittedAt ||
      entry?.createdAt ||
      nowIso(),

    error:
      normalizeText(
        entry?.error ||
        entry?.result?.error
      ) ||
      null,

    validationErrors:
      safeArray(
        entry?.validationErrors ||
        entry?.result?.validation?.errors
      ),

    validationWarnings:
      safeArray(
        entry?.validationWarnings ||
        entry?.result?.validation?.warnings
      ),

    payload:
      entry?.payload ||
      entry?.request?.payload ||
      null,

    note:
      normalizeText(
        entry?.note ||
        entry?.request?.note
      ) ||
      null,

    allowDuplicate:
      Boolean(
        entry?.allowDuplicate ??
        entry?.request?.allowDuplicate
      ),

    retryCount:
      Math.max(
        Number(
          entry?.retryCount ||
          0
        ) || 0,
        0
      ),

    lastRetryAt:
      entry?.lastRetryAt ||
      null,

    parentHistoryId:
      entry?.parentHistoryId ||
      null,

    archived:
      Boolean(
        entry?.archived
      ),

    createdAt:
      entry?.createdAt ||
      nowIso(),

    updatedAt:
      entry?.updatedAt ||
      nowIso(),

    events:
      safeArray(
        entry?.events
      )
  };
}

export async function loadFilingSubmissionHistoryMetadata() {
  const metadata =
    await readJson(
      FILING_SUBMISSION_HISTORY_KEYS
        .METADATA,
      buildDefaultMetadata()
    );

  return {
    ...buildDefaultMetadata(),
    ...metadata,
    schemaVersion:
      FILING_SUBMISSION_HISTORY_SCHEMA_VERSION
  };
}

export async function loadFilingSubmissionHistory({
  includeArchived = false
} = {}) {
  const records =
    await readJson(
      FILING_SUBMISSION_HISTORY_KEYS
        .RECORDS,
      []
    );

  return safeArray(records)
    .map(
      normalizeFilingSubmissionHistoryEntry
    )
    .filter(
      (entry) =>
        includeArchived ||
        !entry.archived
    )
    .sort(
      (first, second) =>
        new Date(
          second.updatedAt
        ).getTime() -
        new Date(
          first.updatedAt
        ).getTime()
    );
}

async function persistHistory(
  records
) {
  const normalized =
    safeArray(records).map(
      normalizeFilingSubmissionHistoryEntry
    );

  await writeJson(
    FILING_SUBMISSION_HISTORY_KEYS
      .RECORDS,
    normalized
  );

  const metadata =
    await loadFilingSubmissionHistoryMetadata();

  await writeJson(
    FILING_SUBMISSION_HISTORY_KEYS
      .METADATA,
    {
      ...metadata,

      updatedAt:
        nowIso(),

      total:
        normalized.length
    }
  );

  return normalized;
}

export async function saveFilingSubmissionHistoryEntry({
  request = {},
  result = {},
  error = null,
  parentHistoryId = null
} = {}) {
  const records =
    await loadFilingSubmissionHistory({
      includeArchived:
        true
    });

  const entry =
    normalizeFilingSubmissionHistoryEntry({
      request,

      result: {
        ...result,

        error:
          error?.message ||
          error ||
          result?.error ||
          null
      },

      payload:
        request?.payload ||
        null,

      parentHistoryId,

      events: [
        {
          action:
            "SUBMISSION_RECORDED",

          timestamp:
            nowIso(),

          status:
            result?.status ||
            (
              error
                ? "FAILED"
                : "UNKNOWN"
            )
        }
      ]
    });

  records.push(
    entry
  );

  await persistHistory(
    records
  );

  return entry;
}

export async function loadFilingSubmissionHistoryEntry(
  id
) {
  const records =
    await loadFilingSubmissionHistory({
      includeArchived:
        true
    });

  return records.find(
    (entry) =>
      entry.id === id
  ) || null;
}

export async function retryFilingSubmission({
  historyId,
  actor = null,
  allowDuplicate = null
} = {}) {
  const original =
    await loadFilingSubmissionHistoryEntry(
      historyId
    );

  if (!original) {
    throw new Error(
      "Submission history entry was not found."
    );
  }

  if (!original.payload) {
    throw new Error(
      "This history entry does not contain a retry payload."
    );
  }

  const records =
    await loadFilingSubmissionHistory({
      includeArchived:
        true
    });

  const originalIndex =
    records.findIndex(
      (entry) =>
        entry.id ===
        historyId
    );

  records[originalIndex] = {
    ...original,

    historyStatus:
      FILING_SUBMISSION_HISTORY_STATUSES
        .RETRYING,

    retryCount:
      original.retryCount +
      1,

    lastRetryAt:
      nowIso(),

    updatedAt:
      nowIso(),

    events: [
      ...safeArray(
        original.events
      ),
      {
        action:
          "RETRY_STARTED",

        timestamp:
          nowIso(),

        actor:
          normalizeActor(actor)
      }
    ]
  };

  await persistHistory(
    records
  );

  const {
    submitFilingReadyPayload
  } =
    await import(
      "./filingImportBridgeService"
    );

  return submitFilingReadyPayload({
    payload:
      original.payload,

    sourceWorkspace:
      original.sourceWorkspace,

    submissionMode:
      original.submissionMode,

    actor:
      actor ||
      original.submittedBy,

    note:
      original.note ||
      "Retried from PC-025H submission history.",

    allowDuplicate:
      allowDuplicate === null
        ? original.allowDuplicate
        : Boolean(
            allowDuplicate
          ),

    historyParentId:
      original.id
  });
}

export async function resolveDuplicateSubmission({
  historyId,
  resolution,
  actor = null,
  note = null,
  existingFilingId = null
} = {}) {
  const records =
    await loadFilingSubmissionHistory({
      includeArchived:
        true
    });

  const index =
    records.findIndex(
      (entry) =>
        entry.id ===
        historyId
    );

  if (index < 0) {
    throw new Error(
      "Submission history entry was not found."
    );
  }

  const normalizedResolution =
    normalizeCode(resolution);

  const entry =
    records[index];

  records[index] = {
    ...entry,

    duplicateResolution:
      normalizedResolution,

    duplicateResolutionNote:
      normalizeText(note) ||
      null,

    duplicateOfFilingId:
      existingFilingId ||
      entry.duplicateOfFilingId,

    historyStatus:
      normalizedResolution ===
      FILING_DUPLICATE_RESOLUTIONS
        .CANCELLED
        ? FILING_SUBMISSION_HISTORY_STATUSES
            .RESOLVED
        : entry.historyStatus,

    updatedAt:
      nowIso(),

    events: [
      ...safeArray(
        entry.events
      ),
      {
        action:
          "DUPLICATE_RESOLVED",

        resolution:
          normalizedResolution,

        existingFilingId:
          existingFilingId ||
          null,

        actor:
          normalizeActor(actor),

        note:
          normalizeText(note) ||
          null,

        timestamp:
          nowIso()
      }
    ]
  };

  await persistHistory(
    records
  );

  if (
    normalizedResolution ===
    FILING_DUPLICATE_RESOLUTIONS
      .OVERRIDE_AND_SUBMIT
  ) {
    return retryFilingSubmission({
      historyId,

      actor,

      allowDuplicate:
        true
    });
  }

  return records[index];
}

export async function archiveFilingSubmissionHistoryEntry(
  id
) {
  const records =
    await loadFilingSubmissionHistory({
      includeArchived:
        true
    });

  const index =
    records.findIndex(
      (entry) =>
        entry.id === id
    );

  if (index < 0) {
    return false;
  }

  records[index] = {
    ...records[index],

    archived:
      true,

    historyStatus:
      FILING_SUBMISSION_HISTORY_STATUSES
        .ARCHIVED,

    updatedAt:
      nowIso()
  };

  await persistHistory(
    records
  );

  return true;
}

export async function clearFilingSubmissionHistory() {
  await AsyncStorage.multiRemove([
    FILING_SUBMISSION_HISTORY_KEYS
      .RECORDS,

    FILING_SUBMISSION_HISTORY_KEYS
      .METADATA
  ]);

  return true;
}

export async function buildFilingSubmissionHistorySummary() {
  const records =
    await loadFilingSubmissionHistory();

  return {
    total:
      records.length,

    submitted:
      records.filter(
        (entry) =>
          entry.submitted
      ).length,

    failed:
      records.filter(
        (entry) =>
          entry.historyStatus ===
          FILING_SUBMISSION_HISTORY_STATUSES
            .FAILED
      ).length,

    invalid:
      records.filter(
        (entry) =>
          entry.historyStatus ===
          FILING_SUBMISSION_HISTORY_STATUSES
            .INVALID
      ).length,

    duplicateReview:
      records.filter(
        (entry) =>
          entry.historyStatus ===
          FILING_SUBMISSION_HISTORY_STATUSES
            .DUPLICATE_REVIEW_REQUIRED
      ).length,

    retried:
      records.filter(
        (entry) =>
          entry.retryCount >
          0
      ).length,

    linkedFilings:
      records.filter(
        (entry) =>
          entry.filingId
      ).length,

    recent:
      records.slice(
        0,
        10
      )
  };
}
