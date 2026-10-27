import {
  initializeAuthenticatedInvestorTransactionHistoryAuthority
} from "./investorBrokerTransactionHistory.service.js";

function clean(value) {
  return String(value ?? "").trim();
}

function statusForError(error) {
  switch (error?.code) {
    case "BROKER_LINK_NOT_OWNED":
    case "BROKER_LINK_NOT_ACTIVE":
      return 403;

    default:
      return 400;
  }
}

/*
 * First-use canonical Transaction History authority.
 *
 * Security:
 * - investor identity comes from req.user
 * - client supplies only brokerLinkId
 * - broker account identity is resolved server-side
 *
 * This endpoint does not append transaction history.
 */
export async function
investorTransactionHistoryAuthorityHandler(
  req,
  res
) {
  try {
    const authenticatedUserId =
      clean(req.user?.id);

    if (!authenticatedUserId) {
      return res.status(401).json({
        ok: false,
        code:
          "AUTHENTICATED_INVESTOR_REQUIRED",
        error:
          "Authentication is required."
      });
    }

    const brokerLinkId =
      clean(req.body?.brokerLinkId);

    if (!brokerLinkId) {
      return res.status(400).json({
        ok: false,
        code:
          "BROKER_LINK_REQUIRED",
        error:
          "brokerLinkId is required."
      });
    }

    /*
     * Do not allow the client to provide canonical identity,
     * generation or audit actor information.
     */
    const prohibitedFields = [
      "userId",
      "authenticatedUserId",
      "targetUserId",
      "actorUserId",
      "brokerAccountKey",
      "currentGeneration",
      "authorityGeneration",
      "observedGeneration"
    ];

    for (const field of prohibitedFields) {
      if (
        req.body?.[field] !== undefined &&
        req.body?.[field] !== null
      ) {
        return res.status(400).json({
          ok: false,
          code:
            "CLIENT_AUTHORITY_IDENTITY_REJECTED",
          error:
            field +
            " must not be supplied by the client."
        });
      }
    }

    const authority =
      await initializeAuthenticatedInvestorTransactionHistoryAuthority({
        authenticatedUserId,
        brokerLinkId
      });

    return res.json({
      ok: true,
      ...authority
    });
  } catch (error) {
    return res
      .status(statusForError(error))
      .json({
        ok: false,
        code:
          error?.code || null,
        error:
          error?.message ||
          "Transaction History authority could not be initialized."
      });
  }
}
