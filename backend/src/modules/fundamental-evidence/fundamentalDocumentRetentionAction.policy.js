function clean(value) {
  return String(value ?? "").trim();
}

function actionError(
  code,
  message
) {
  const error =
    new Error(message);

  error.code =
    code;

  return error;
}

function requireAdminActor(actor) {
  const id =
    clean(actor?.id);

  const role =
    clean(actor?.role)
      .toUpperCase();

  if (!id) {
    throw actionError(
      "FUNDAMENTAL_DOCUMENT_RETENTION_ACTOR_REQUIRED",
      "A persisted actor is required for document retention."
    );
  }

  if (role !== "ADMIN") {
    throw actionError(
      "FUNDAMENTAL_DOCUMENT_RETENTION_ADMIN_REQUIRED",
      "Administrator authority is required for document retention."
    );
  }

  return {
    id,
    role
  };
}

function requireConfirmation(value) {
  if (value !== true) {
    throw actionError(
      "FUNDAMENTAL_DOCUMENT_RETENTION_CONFIRMATION_REQUIRED",
      "Explicit confirmation is required before document retention."
    );
  }

  return true;
}

function requireReason(value) {
  const reason =
    clean(value);

  if (!reason) {
    throw actionError(
      "FUNDAMENTAL_DOCUMENT_RETENTION_REASON_REQUIRED",
      "A retention reason is required."
    );
  }

  return reason;
}

/*
 * Explicit administrative action policy.
 *
 * This policy:
 * - does not retrieve documents,
 * - does not write files,
 * - does not mutate the database,
 * - does not verify filings,
 * - does not approve filings,
 * - does not promote fundamentals.
 *
 * It only authorizes an explicit retention attempt.
 */
export function authorizeFundamentalDocumentRetention({
  actor,
  confirmed,
  reason
} = {}) {
  return {
    actor:
      requireAdminActor(actor),

    confirmed:
      requireConfirmation(confirmed),

    reason:
      requireReason(reason)
  };
}

export default {
  authorizeFundamentalDocumentRetention
};
