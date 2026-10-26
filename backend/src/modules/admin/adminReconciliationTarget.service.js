import {
  findUserById,
  listUsersForAdmin
} from "../users/users.repository.js";

import {
  getUserBrokerLinks
} from "../broker-links/brokerLinks.repository.js";

import {
  canonicalTransactionHistoryBroker
} from "../transaction-history/investorBrokerTransactionHistory.service.js";

function serviceError(
  code,
  message,
  status = 400
) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function safeTarget(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function assertEligibleTarget(user) {
  if (!user) {
    throw serviceError(
      "RECONCILIATION_TARGET_NOT_FOUND",
      "The selected reconciliation target was not found.",
      404
    );
  }

  if (
    String(user.role || "")
      .trim()
      .toUpperCase() !== "USER"
  ) {
    throw serviceError(
      "RECONCILIATION_TARGET_ROLE_FORBIDDEN",
      "Administrative accounts cannot be selected as investor reconciliation targets.",
      409
    );
  }

  if (
    String(user.status || "")
      .trim()
      .toUpperCase() !== "ACTIVE"
  ) {
    throw serviceError(
      "RECONCILIATION_TARGET_INACTIVE",
      "Only active investor accounts can be selected for reconciliation.",
      409
    );
  }

  return user;
}

export async function listAdminReconciliationTargets() {
  const users =
    await listUsersForAdmin();

  return users
    .filter(
      (user) =>
        String(user?.role || "")
          .trim()
          .toUpperCase() === "USER" &&
        String(user?.status || "")
          .trim()
          .toUpperCase() === "ACTIVE"
    )
    .map(safeTarget);
}

export async function getAdminReconciliationBroker({
  targetUserId,
  brokerLinkId
} = {}) {
  const normalizedTargetUserId =
    String(targetUserId || "").trim();

  const normalizedBrokerLinkId =
    String(brokerLinkId || "").trim();

  if (!normalizedTargetUserId) {
    throw serviceError(
      "RECONCILIATION_TARGET_REQUIRED",
      "A reconciliation target user is required.",
      400
    );
  }

  if (!normalizedBrokerLinkId) {
    throw serviceError(
      "RECONCILIATION_BROKER_REQUIRED",
      "A target broker account is required.",
      400
    );
  }

  const user =
    assertEligibleTarget(
      await findUserById(
        normalizedTargetUserId
      )
    );

  const brokers =
    await getUserBrokerLinks(user.id);

  const broker =
    brokers.find(
      (item) =>
        String(item?.id || "").trim() ===
        normalizedBrokerLinkId
    );

  if (!broker) {
    throw serviceError(
      "RECONCILIATION_BROKER_NOT_OWNED",
      "The selected broker account does not belong to the reconciliation target.",
      409
    );
  }

  if (
    String(broker.status || "")
      .trim()
      .toUpperCase() !== "ACTIVE"
  ) {
    throw serviceError(
      "RECONCILIATION_BROKER_INACTIVE",
      "Only an active broker account can be used for reconciliation.",
      409
    );
  }

  const brokerId =
    String(broker.broker || "")
      .trim()
      .toUpperCase();

  const clientNumber =
    String(broker.clientNumber || "")
      .trim();

  if (!brokerId || !clientNumber) {
    throw serviceError(
      "RECONCILIATION_BROKER_IDENTITY_INCOMPLETE",
      "The selected broker account does not have a complete broker and client-account identity.",
      409
    );
  }

  return {
    target: safeTarget(user),
    broker: {
      ...broker,
      broker: brokerId,
      clientNumber
    },
    brokerAccountKey:
      `${canonicalTransactionHistoryBroker(
        brokerId
      )}|${clientNumber}`
  };
}



export async function getAdminTargetBrokerLinks({
  targetUserId
} = {}) {
  const normalizedTargetUserId =
    String(targetUserId || "").trim();

  if (!normalizedTargetUserId) {
    throw serviceError(
      "RECONCILIATION_TARGET_REQUIRED",
      "A reconciliation target user is required.",
      400
    );
  }

  const user =
    assertEligibleTarget(
      await findUserById(
        normalizedTargetUserId
      )
    );

  const brokers =
    await getUserBrokerLinks(user.id);

  return {
    target: safeTarget(user),
    brokers
  };
}

export async function lockAdminReconciliationBrokerContext(
  {
    targetUserId,
    brokerLinkId
  } = {},
  queryable
) {
  const targetId =
    String(
      targetUserId || ""
    ).trim();

  const linkId =
    String(
      brokerLinkId || ""
    ).trim();

  if (!targetId || !linkId) {
    throw reconciliationError(
      400,
      "RECONCILIATION_CONTEXT_INPUT_INVALID",
      "targetUserId and brokerLinkId are required."
    );
  }

  if (
    !queryable ||
    typeof queryable.query !== "function"
  ) {
    throw new Error(
      "A transaction-bound queryable database client is required."
    );
  }

  /*
   * Lock the target first. This prevents role/status changes
   * from racing the authoritative reconciliation transaction.
   */
  const targetResult =
    await queryable.query(
      `
        SELECT
          id,
          email,
          username,
          role,
          status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM
          public.auth_users
        WHERE
          id = $1
        LIMIT 1
        FOR UPDATE
      `,
      [
        targetId
      ]
    );

  const user =
    targetResult.rows[0];

  if (!user) {
    throw reconciliationError(
      404,
      "RECONCILIATION_TARGET_NOT_FOUND",
      "Reconciliation target was not found."
    );
  }

  if (
    String(
      user.role || ""
    ).toUpperCase() !== "USER"
  ) {
    throw reconciliationError(
      409,
      "RECONCILIATION_TARGET_ROLE_FORBIDDEN",
      "Reconciliation target must have USER role."
    );
  }

  if (
    String(
      user.status || ""
    ).toUpperCase() !== "ACTIVE"
  ) {
    throw reconciliationError(
      409,
      "RECONCILIATION_TARGET_INACTIVE",
      "Reconciliation target must be active."
    );
  }

  /*
   * Lock the exact broker link second and enforce ownership
   * in the SQL predicate itself.
   */
  const brokerResult =
    await queryable.query(
      `
        SELECT
          id,
          user_id AS "userId",
          broker,
          client_number AS "clientNumber",
          cds_number AS "cdsNumber",
          status,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM
          public.user_broker_links
        WHERE
          id = $1
          AND user_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [
        linkId,
        targetId
      ]
    );

  const broker =
    brokerResult.rows[0];

  if (!broker) {
    throw reconciliationError(
      409,
      "RECONCILIATION_BROKER_NOT_OWNED",
      "Selected broker account does not belong to the reconciliation target."
    );
  }

  if (
    String(
      broker.status || ""
    ).toUpperCase() !== "ACTIVE"
  ) {
    throw reconciliationError(
      409,
      "RECONCILIATION_BROKER_INACTIVE",
      "Selected broker account must be active."
    );
  }

  const brokerId =
    String(
      broker.broker || ""
    ).trim().toUpperCase();

  const clientNumber =
    String(
      broker.clientNumber || ""
    ).trim();

  if (
    !brokerId ||
    !clientNumber
  ) {
    throw reconciliationError(
      409,
      "RECONCILIATION_BROKER_IDENTITY_INCOMPLETE",
      "Selected broker account does not have complete persisted identity."
    );
  }

  return {
    target:
      safeTarget(user),
    broker: {
      ...broker,
      broker:
        brokerId,
      clientNumber
    },
    brokerAccountKey:
      `${canonicalTransactionHistoryBroker(
        brokerId
      )}|${clientNumber}`
  };
}
