import {
  appendAuthenticatedInvestorTransactionHistory
} from "./investorBrokerTransactionHistory.service.js";

function clean(value) {
  return String(
    value ?? ""
  ).trim();
}

function requireAuthenticatedUserId(
  req
) {
  const userId =
    clean(
      req?.user?.id
    );

  if (!userId) {
    const error =
      new Error(
        "Authenticated investor identity is required."
      );

    error.code =
      "AUTHENTICATED_INVESTOR_REQUIRED";

    throw error;
  }

  return userId;
}

function rejectClientIdentityFields(
  body = {}
) {
  const forbidden = [
    "userId",
    "targetUserId",
    "actorUserId",
    "authenticatedUserId",
    "brokerAccountKey",
    "authorityGeneration",
    "currentGeneration"
  ];

  const supplied =
    forbidden.filter(
      key =>
        body[key] !== undefined
    );

  if (supplied.length > 0) {
    const error =
      new Error(
        "Client-supplied investor or authority identity is not allowed."
      );

    error.code =
      "CLIENT_TRANSACTION_HISTORY_IDENTITY_REJECTED";

    error.fields =
      supplied;

    throw error;
  }
}

function requireBrokerLinkId(
  value
) {
  const brokerLinkId =
    clean(value);

  if (!brokerLinkId) {
    const error =
      new Error(
        "brokerLinkId is required."
      );

    error.code =
      "BROKER_LINK_REQUIRED";

    throw error;
  }

  return brokerLinkId;
}

function requireObservedGeneration(
  value
) {
  const generation =
    Number(value);

  if (
    !Number.isInteger(generation) ||
    generation < 1
  ) {
    const error =
      new Error(
        "A valid observedGeneration is required."
      );

    error.code =
      "OBSERVED_GENERATION_REQUIRED";

    throw error;
  }

  return generation;
}

function requireExecutions(
  value
) {
  if (
    !Array.isArray(value) ||
    value.length === 0
  ) {
    const error =
      new Error(
        "At least one historical execution is required."
      );

    error.code =
      "HISTORICAL_EXECUTIONS_REQUIRED";

    throw error;
  }

  return value;
}

function statusForError(
  error
) {
  switch (
    error?.code
  ) {
    case "AUTHENTICATED_INVESTOR_REQUIRED":
      return 401;

    case "BROKER_LINK_NOT_OWNED":
    case "BROKER_LINK_NOT_ACTIVE":
    case "CLIENT_TRANSACTION_HISTORY_IDENTITY_REJECTED":
      return 403;

    case "STALE_TRANSACTION_HISTORY_GENERATION":
      return 409;

    case "BROKER_LINK_REQUIRED":
    case "OBSERVED_GENERATION_REQUIRED":
    case "HISTORICAL_EXECUTIONS_REQUIRED":
    case "HISTORICAL_EXECUTION_IDENTITY_MISMATCH":
      return 400;

    default:
      return 400;
  }
}

/*
 * R7O-R4E7R15
 *
 * Normal authenticated Transaction History append transport.
 *
 * Security:
 * - investor identity comes only from req.user.id
 * - client supplies an owned brokerLinkId
 * - brokerAccountKey is derived server-side
 * - authority generation cannot be chosen by the client;
 *   the client only reports the generation it observed
 *
 * This is intentionally separate from:
 * - bootstrap/migration
 * - Admin reset
 * - Admin maintenance
 */
export function createInvestorTransactionHistoryAppendHandler({
  append =
    appendAuthenticatedInvestorTransactionHistory
} = {}) {
  return async function investorTransactionHistoryAppendHandler(
    req,
    res
  ) {
    try {
      const body =
        req?.body &&
        typeof req.body ===
          "object"
          ? req.body
          : {};

      rejectClientIdentityFields(
        body
      );

      const authenticatedUserId =
        requireAuthenticatedUserId(
          req
        );

      const brokerLinkId =
        requireBrokerLinkId(
          body.brokerLinkId
        );

      const observedGeneration =
        requireObservedGeneration(
          body.observedGeneration
        );

      const executions =
        requireExecutions(
          body.executions
        );

      const result =
        await append(
          {
            authenticatedUserId,
            brokerLinkId,
            observedGeneration,
            executions
          }
        );

      return res
        .status(200)
        .json({
          ok: true,
          append:
            result
        });
    } catch (error) {
      return res
        .status(
          statusForError(
            error
          )
        )
        .json({
          ok: false,

          error: {
            code:
              clean(
                error?.code
              ) ||
              "TRANSACTION_HISTORY_APPEND_REJECTED",

            message:
              clean(
                error?.message
              ) ||
              "Transaction History append was rejected."
          }
        });
    }
  };
}

export const investorTransactionHistoryAppendHandler =
  createInvestorTransactionHistoryAppendHandler();
