import {
  bootstrapAuthenticatedInvestorTransactionHistory
} from "./investorBrokerTransactionHistoryBootstrap.service.js";

function clean(value) {
  return String(
    value ?? ""
  ).trim();
}

function rejectClientIdentityFields(
  body = {}
) {
  const forbidden = [
    "userId",
    "targetUserId",
    "actorUserId",
    "authenticatedUserId",
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
        "Client-supplied user or authority identity is not allowed."
      );

    error.code =
      "CLIENT_BOOTSTRAP_AUTHORITY_REJECTED";

    error.fields =
      supplied;

    throw error;
  }
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

function requireExpectedEvidenceSha256(
  value
) {
  const hash =
    clean(value)
      .toLowerCase();

  if (
    !/^[a-f0-9]{64}$/.test(hash)
  ) {
    const error =
      new Error(
        "A valid expectedEvidenceSha256 is required."
      );

    error.code =
      "HISTORICAL_EVIDENCE_FINGERPRINT_REQUIRED";

    throw error;
  }

  return hash;
}

function requirePartitions(
  value
) {
  if (
    !Array.isArray(value) ||
    value.length !== 2
  ) {
    const error =
      new Error(
        "Exactly two broker history partitions are required for bootstrap."
      );

    error.code =
      "BOOTSTRAP_PARTITION_COUNT_INVALID";

    throw error;
  }

  const brokerLinkIds =
    value.map(
      partition =>
        clean(
          partition?.brokerLinkId
        )
    );

  if (
    brokerLinkIds.some(
      value => !value
    )
  ) {
    const error =
      new Error(
        "Each bootstrap partition requires brokerLinkId."
      );

    error.code =
      "BOOTSTRAP_BROKER_LINK_REQUIRED";

    throw error;
  }

  if (
    new Set(
      brokerLinkIds
    ).size !==
    brokerLinkIds.length
  ) {
    const error =
      new Error(
        "Bootstrap broker partitions must be unique."
      );

    error.code =
      "BOOTSTRAP_DUPLICATE_BROKER_PARTITION";

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

    case "CLIENT_BOOTSTRAP_AUTHORITY_REJECTED":
    case "BROKER_LINK_NOT_OWNED":
    case "BROKER_LINK_NOT_ACTIVE":
      return 403;

    case "STALE_TRANSACTION_HISTORY_GENERATION":
      return 409;

    case "HISTORICAL_EVIDENCE_FINGERPRINT_MISMATCH":
      return 409;

    case "HISTORICAL_EVIDENCE_FINGERPRINT_REQUIRED":
    case "OBSERVED_GENERATION_REQUIRED":
    case "BOOTSTRAP_PARTITION_COUNT_INVALID":
    case "BOOTSTRAP_BROKER_LINK_REQUIRED":
    case "BOOTSTRAP_DUPLICATE_BROKER_PARTITION":
    case "HISTORICAL_EXECUTION_IDENTITY_MISMATCH":
      return 400;

    default:
      return 400;
  }
}

/*
 * ADMIN-TXHIST-004D4-R7M
 *
 * Bootstrap-only authenticated transport.
 *
 * The target investor is always req.user.id.
 * Client input cannot select another user or authority generation.
 * Both broker partitions are submitted to the coordinator once.
 */
export function createInvestorTransactionHistoryBootstrapHandler({
  bootstrap =
    bootstrapAuthenticatedInvestorTransactionHistory
} = {}) {
  return async function investorTransactionHistoryBootstrapHandler(
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

      const observedGeneration =
        requireObservedGeneration(
          body.observedGeneration
        );

      const expectedEvidenceSha256 =
        requireExpectedEvidenceSha256(
          body.expectedEvidenceSha256
        );

      const partitions =
        requirePartitions(
          body.partitions
        );

      const result =
        await bootstrap(
          {
            authenticatedUserId,
            observedGeneration,
            expectedEvidenceSha256,
            partitions
          }
        );

      return res
        .status(200)
        .json({
          ok: true,
          bootstrap:
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
              "TRANSACTION_HISTORY_BOOTSTRAP_REJECTED",

            message:
              clean(
                error?.message
              ) ||
              "Transaction History bootstrap was rejected."
          }
        });
    }
  };
}

export const investorTransactionHistoryBootstrapHandler =
  createInvestorTransactionHistoryBootstrapHandler();
