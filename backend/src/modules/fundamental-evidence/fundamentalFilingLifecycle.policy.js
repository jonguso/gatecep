const TRANSITIONS = Object.freeze({
  SUBMIT: Object.freeze({
    from: "DRAFT",
    to: "PENDING_REVIEW"
  }),

  VERIFY: Object.freeze({
    from: "PENDING_REVIEW",
    to: "VERIFIED"
  }),

  APPROVE: Object.freeze({
    from: "VERIFIED",
    to: "APPROVED"
  })
});

function normalizeText(value) {
  return String(value || "")
    .trim();
}

function normalizeAction(value) {
  return normalizeText(value)
    .toUpperCase();
}

function normalizeActor(actor) {
  if (!actor) {
    return null;
  }

  if (typeof actor === "string") {
    return {
      id: actor,
      name: actor
    };
  }

  return {
    id:
      actor.id ||
      actor.email ||
      actor.name ||
      null,

    name:
      actor.name ||
      actor.email ||
      actor.id ||
      "Unknown Reviewer"
  };
}

function lifecycleError(
  status,
  code,
  message
) {
  const error =
    new Error(message);

  error.status =
    status;

  error.code =
    code;

  return error;
}

function appendNote({
  review,
  note,
  actor,
  timestamp
}) {
  const normalizedNote =
    normalizeText(note);

  if (!normalizedNote) {
    return review;
  }

  return {
    ...review,

    notes: [
      ...(
        Array.isArray(review.notes)
          ? review.notes
          : []
      ),
      {
        note:
          normalizedNote,

        actor:
          normalizeActor(actor),

        timestamp
      }
    ]
  };
}

function appendAudit({
  payload,
  action,
  actor,
  note,
  timestamp
}) {
  return {
    ...payload,

    auditTrail: [
      ...(
        Array.isArray(payload.auditTrail)
          ? payload.auditTrail
          : []
      ),
      {
        action,
        actor:
          normalizeActor(actor),
        note:
          normalizeText(note) ||
          null,
        timestamp
      }
    ],

    updatedAt:
      timestamp
  };
}

export function getFundamentalFilingTransition(
  action
) {
  const normalizedAction =
    normalizeAction(action);

  return (
    TRANSITIONS[
      normalizedAction
    ] ||
    null
  );
}

export function applyFundamentalFilingTransition({
  currentStatus,
  action,
  actor,
  note = null,
  filingPayload,
  timestamp
} = {}) {
  const normalizedAction =
    normalizeAction(action);

  const transition =
    getFundamentalFilingTransition(
      normalizedAction
    );

  if (!transition) {
    throw lifecycleError(
      400,
      "FUNDAMENTAL_FILING_ACTION_UNSUPPORTED",
      `Unsupported filing lifecycle action: ${normalizedAction || "UNKNOWN"}.`
    );
  }

  if (
    currentStatus !==
    transition.from
  ) {
    throw lifecycleError(
      409,
      "FUNDAMENTAL_FILING_TRANSITION_INVALID",
      `Cannot ${normalizedAction} filing from ${currentStatus || "UNKNOWN"}; expected ${transition.from}.`
    );
  }

  const normalizedActor =
    normalizeActor(actor);

  if (!normalizedActor?.id) {
    throw lifecycleError(
      400,
      "FUNDAMENTAL_FILING_ACTOR_REQUIRED",
      "A persisted filing lifecycle actor is required."
    );
  }

  if (
    !filingPayload ||
    typeof filingPayload !==
      "object" ||
    Array.isArray(filingPayload)
  ) {
    throw lifecycleError(
      409,
      "FUNDAMENTAL_FILING_PAYLOAD_INVALID",
      "Persisted filing payload must be an object."
    );
  }

  const eventTimestamp =
    timestamp ||
    new Date().toISOString();

  let review = {
    ...(
      filingPayload.review &&
      typeof filingPayload.review ===
        "object" &&
      !Array.isArray(
        filingPayload.review
      )
        ? filingPayload.review
        : {}
    )
  };

  if (
    normalizedAction ===
    "SUBMIT"
  ) {
    review.submittedAt =
      eventTimestamp;

    review.submittedBy =
      normalizedActor;
  } else if (
    normalizedAction ===
    "VERIFY"
  ) {
    review.verifiedAt =
      eventTimestamp;

    review.verifiedBy =
      normalizedActor;
  } else if (
    normalizedAction ===
    "APPROVE"
  ) {
    review.approvedAt =
      eventTimestamp;

    review.approvedBy =
      normalizedActor;
  }

  review =
    appendNote({
      review,
      note,
      actor:
        normalizedActor,
      timestamp:
        eventTimestamp
    });

  let nextPayload = {
    ...filingPayload,

    status:
      transition.to,

    review
  };

  nextPayload =
    appendAudit({
      payload:
        nextPayload,
      action:
        normalizedAction,
      actor:
        normalizedActor,
      note,
      timestamp:
        eventTimestamp
    });

  return {
    action:
      normalizedAction,

    previousStatus:
      currentStatus,

    status:
      transition.to,

    filingPayload:
      nextPayload
  };
}
