import { userGetItem, userSetItem } from "../auth/userStorage";

const EXECUTION_AUDIT_KEY = "executionAuditTrail";
const MAX_EXECUTION_AUDIT_EVENTS = 1000;

/*
 * PC-031A27:
 * Serialize audit read-modify-write operations so two legitimate
 * asynchronous writers cannot overwrite each other's audit evidence.
 *
 * This queue is audit-only:
 * - it is not a broker submission lock,
 * - it does not control OMS state,
 * - it does not create fills,
 * - it does not affect canonical portfolio accounting.
 *
 * The chain is deliberately recovered after rejection so one failed
 * audit write cannot permanently poison later audit writes.
 */
let executionAuditWriteChain = Promise.resolve();

function enqueueExecutionAuditWrite(task) {
  const queued =
    executionAuditWriteChain.then(
      () => task()
    );

  executionAuditWriteChain =
    queued.catch(() => undefined);

  return queued;
}

/*
 * PC-031A30:
 * Audit event IDs must be unique within the persisted local trail.
 *
 * The sequence is only an additional candidate discriminator.
 * Persisted IDs remain the authority: allocation happens inside the
 * serialized audit mutation queue and retries until the candidate is
 * absent from the latest stored trail.
 *
 * This also protects against module reloads where the in-memory
 * sequence restarts while older audit IDs remain in storage.
 */
let executionAuditIdSequence = 0;

function createUniqueExecutionAuditEventId(events = []) {
  const existingIds =
    new Set(
      (Array.isArray(events) ? events : [])
        .map((event) =>
          String(event?.id || "").trim()
        )
        .filter(Boolean)
    );

  let candidate = "";

  do {
    executionAuditIdSequence += 1;

    candidate =
      `AUD-${Date.now()}-` +
      `${executionAuditIdSequence.toString(36)}-` +
      `${Math.random().toString(36).slice(2, 8)}`;
  } while (existingIds.has(candidate));

  return candidate;
}

function isRealExecutionAuditEvent(event = {}) {
  return (
    String(event.executionMode || "").trim().toUpperCase() === "REAL" ||
    String(event.eventType || "").trim().toUpperCase().startsWith("REAL_")
  );
}

function realExecutionLifecycleKey(
  event = {},
  {
    idIsDuplicate = false,
    fallbackRecordKey = ""
  } = {}
) {
  const orderId = String(event.orderId || "").trim();
  const executionId = String(event.executionId || "").trim();
  const brokerOrderId = String(event.brokerOrderId || "").trim();
  const brokerReference = String(event.brokerReference || "").trim();
  const id = String(event.id || "").trim();

  if (orderId) {
    return `ORDER:${orderId}`;
  }

  if (executionId) {
    return `EXECUTION:${executionId}`;
  }

  if (brokerOrderId) {
    return `BROKER_ORDER:${brokerOrderId}`;
  }

  if (brokerReference) {
    return `BROKER_REFERENCE:${brokerReference}`;
  }

  /*
   * PC-031A31:
   * A pre-A30 audit record may have a missing or duplicated event.id.
   *
   * Do not rewrite historical evidence. When no stronger lifecycle
   * identity exists, use a unique persisted id only when it is
   * actually unique inside this retention snapshot. Otherwise treat
   * each legacy record independently.
   */
  if (id && !idIsDuplicate) {
    return `EVENT:${id}`;
  }

  return (
    `LEGACY_EVENT:` +
    `${fallbackRecordKey || "UNIDENTIFIED"}`
  );
}

function retainExecutionAuditEvents(events = []) {
  const source = Array.isArray(events)
    ? events.filter(Boolean)
    : [];

  const realGroups = new Map();
  const realGroupOrder = [];
  const nonRealEvents = [];

  /*
   * PC-031A31:
   * Count fallback event IDs before grouping. A duplicated legacy ID
   * is not sufficient lifecycle identity when no stronger broker/OMS
   * identity exists.
   */
  const realEventIdCounts = new Map();

  for (const event of source) {
    if (!isRealExecutionAuditEvent(event)) {
      continue;
    }

    const id =
      String(event?.id || "").trim();

    if (!id) {
      continue;
    }

    realEventIdCounts.set(
      id,
      (realEventIdCounts.get(id) || 0) + 1
    );
  }

  for (
    let sourceIndex = 0;
    sourceIndex < source.length;
    sourceIndex += 1
  ) {
    const event = source[sourceIndex];

    if (!isRealExecutionAuditEvent(event)) {
      nonRealEvents.push(event);
      continue;
    }

    const id =
      String(event?.id || "").trim();

    const key =
      realExecutionLifecycleKey(
        event,
        {
          idIsDuplicate:
            Boolean(id) &&
            (realEventIdCounts.get(id) || 0) > 1,
          fallbackRecordKey:
            String(sourceIndex)
        }
      );

    if (!realGroups.has(key)) {
      realGroups.set(key, []);
      realGroupOrder.push(key);
    }

    realGroups.get(key).push(event);
  }

  const retainedRealEvents = [];
  let retainedRealCount = 0;

  for (const key of realGroupOrder) {
    const group =
      realGroups.get(key) || [];

    /*
     * REAL execution history is retained by complete lifecycle group.
     * If the next oldest group would exceed the bounded audit store,
     * stop there rather than retaining an arbitrary suffix of that
     * lifecycle.
     */
    if (
      retainedRealCount + group.length >
      MAX_EXECUTION_AUDIT_EVENTS
    ) {
      break;
    }

    retainedRealEvents.push(...group);
    retainedRealCount += group.length;
  }

  const remainingCapacity =
    Math.max(
      MAX_EXECUTION_AUDIT_EVENTS -
        retainedRealCount,
      0
    );

  const retainedNonRealEvents =
    nonRealEvents.slice(
      0,
      remainingCapacity
    );

  /*
   * Preserve the original newest-first chronology after deciding
   * which event objects survive retention.
   */
  const retained =
    new Set([
      ...retainedRealEvents,
      ...retainedNonRealEvents
    ]);

  return source.filter((event) =>
    retained.has(event)
  );
}

export async function loadExecutionAuditTrail() {
  const raw = await userGetItem(EXECUTION_AUDIT_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addExecutionAuditEvent({
  executionId = null,
  orderId = null,
  executionMode = null,
  symbol = "",
  eventType = "INFO",
  status = "",
  brokerStatus = null,
  message = "",
  brokerId = null,
  brokerAccountId = null,
  brokerName = null,
  brokerOrderId = null,
  adapterReportedBrokerId = null,
  submissionAttemptId = null,
  submissionAttemptCount = null,
  evidenceStatus = null,
  brokerReference = null,
  payload = {}
} = {}) {
  const event = {
    id: null,
    executionId,
    orderId,
    executionMode,
    symbol,
    eventType,
    status,
    brokerStatus,
    message,
    brokerId,
    brokerAccountId,
    brokerName,
    brokerOrderId,
    adapterReportedBrokerId,
    submissionAttemptId,
    submissionAttemptCount,
    evidenceStatus,
    brokerReference,
    payload,
    createdAt: new Date().toISOString()
  };

  return enqueueExecutionAuditWrite(
    async () => {
      const events =
        await loadExecutionAuditTrail();

      event.id =
        createUniqueExecutionAuditEventId(
          events
        );

      const next =
        retainExecutionAuditEvents([
          event,
          ...events
        ]);

      await userSetItem(
        EXECUTION_AUDIT_KEY,
        JSON.stringify(next)
      );

      return event;
    }
  );
}

export async function clearExecutionAuditTrail() {
  return enqueueExecutionAuditWrite(
    async () => {
      await userSetItem(
        EXECUTION_AUDIT_KEY,
        ""
      );
    }
  );
}

export function filterAuditTrail(events = [], filters = {}) {
  return events.filter((event) => {
    if (filters.executionId && event.executionId !== filters.executionId) {
      return false;
    }

    if (filters.orderId && event.orderId !== filters.orderId) {
      return false;
    }

    if (
      filters.symbol &&
      String(event.symbol || "").toUpperCase() !==
        String(filters.symbol || "").toUpperCase()
    ) {
      return false;
    }

    if (filters.status && event.status !== filters.status) {
      return false;
    }

    return true;
  });
}