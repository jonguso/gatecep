import { API_URL } from "../../../config/apiConfig.js";
import {
  getStoredAccessToken
} from "../../auth/storage/authStorage.js";
import {
  getUserBrokers
} from "../../brokers/api/userBrokerApi.js";

/*
 * R7O-R4E7R12
 *
 * Authenticated investor Transaction History read bridge.
 *
 * Important:
 * - local broker-account ids are NOT server brokerLinkIds
 * - brokerLinkId is resolved from authenticated /user-brokers
 * - investor identity is never supplied by the client
 * - AIB / AIB AXYS / AIB-AXYS are one canonical broker family
 * - this module performs no local reset and no server mutation
 */

function clean(value) {
  return String(value ?? "").trim();
}

function upper(value) {
  return clean(value).toUpperCase();
}

export function canonicalHistoryBroker(value) {
  const broker = upper(value);

  if (
    broker === "AIB" ||
    broker === "AIB AXYS" ||
    broker === "AIB-AXYS"
  ) {
    return "AIB";
  }

  if (
    broker === "ABC" ||
    broker === "ABC CAPITAL"
  ) {
    return "ABC";
  }

  return broker || null;
}

function canonicalClientNumber(value) {
  return upper(value) || null;
}

function parseBrokerAccountKey(value) {
  const raw = upper(value);

  const separatorIndex =
    raw.indexOf("|");

  if (separatorIndex <= 0) {
    return null;
  }

  const broker =
    canonicalHistoryBroker(
      raw.slice(0, separatorIndex)
    );

  const clientNumber =
    canonicalClientNumber(
      raw.slice(separatorIndex + 1)
    );

  if (!broker || !clientNumber) {
    return null;
  }

  return {
    broker,
    clientNumber
  };
}

function brokerIdentityFromLocalAccount(
  account = {},
  brokerAccountKey = ""
) {
  const fromKey =
    parseBrokerAccountKey(
      brokerAccountKey
    );

  const broker =
    canonicalHistoryBroker(
      fromKey?.broker ||
      account.brokerId ||
      account.broker ||
      account.brokerName ||
      account.name
    );

  const clientNumber =
    canonicalClientNumber(
      fromKey?.clientNumber ||
      account.clientNumber ||
      account.accountNumber ||
      account.tradingAccount
    );

  if (!broker || !clientNumber) {
    throw new Error(
      "The selected broker account does not contain enough identity information to resolve its server broker link."
    );
  }

  return {
    broker,
    clientNumber
  };
}

export async function resolveAuthenticatedBrokerLink({
  brokerAccount = {},
  brokerAccountKey = ""
} = {}) {
  const identity =
    brokerIdentityFromLocalAccount(
      brokerAccount,
      brokerAccountKey
    );

  const result =
    await getUserBrokers();

  if (
    result?.source !== "CLOUD"
  ) {
    throw new Error(
      "The server broker account list is unavailable. Transaction History authority cannot be verified from a local fallback."
    );
  }

  const brokers =
    Array.isArray(result?.brokers)
      ? result.brokers
      : [];

  const matches =
    brokers.filter((item) => {
      if (
        upper(item?.status) !==
        "ACTIVE"
      ) {
        return false;
      }

      return (
        canonicalHistoryBroker(
          item?.broker
        ) === identity.broker &&
        canonicalClientNumber(
          item?.clientNumber
        ) === identity.clientNumber
      );
    });

  if (matches.length === 0) {
    throw new Error(
      "The selected broker account could not be matched to an active authenticated server broker link."
    );
  }

  if (matches.length > 1) {
    throw new Error(
      "More than one active server broker link matches the selected broker account. Transaction History authority is ambiguous."
    );
  }

  const match =
    matches[0];

  const brokerLinkId =
    clean(match?.id);

  if (!brokerLinkId) {
    throw new Error(
      "The authenticated server broker link does not contain an id."
    );
  }

  return {
    brokerLinkId,
    broker:
      canonicalHistoryBroker(
        match?.broker
      ),
    clientNumber:
      canonicalClientNumber(
        match?.clientNumber
      ),
    cdsNumber:
      clean(match?.cdsNumber) ||
      null,
    status:
      upper(match?.status),
    rawBroker:
      clean(match?.broker)
  };
}

export async function loadCanonicalBrokerTransactionHistory({
  brokerLinkId
} = {}) {
  const linkId =
    clean(brokerLinkId);

  if (!linkId) {
    throw new Error(
      "brokerLinkId is required to read canonical Transaction History."
    );
  }

  const token =
    await getStoredAccessToken();

  if (!token) {
    throw new Error(
      "Authentication is required to read canonical Transaction History."
    );
  }

  const params =
    new URLSearchParams();

  params.set(
    "brokerLinkId",
    linkId
  );

  const response =
    await fetch(
      `${API_URL}/transactions/history?${params.toString()}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    data?.ok === false
  ) {
    throw new Error(
      data?.error ||
      "Unable to read canonical Transaction History."
    );
  }

  if (
    clean(data?.brokerLinkId) !==
    linkId
  ) {
    throw new Error(
      "Canonical Transaction History returned a different broker link."
    );
  }

  const history =
    Array.isArray(data?.history)
      ? data.history
      : [];

  const count =
    Number(data?.count);

  if (
    !Number.isInteger(count) ||
    count < 0 ||
    count !== history.length
  ) {
    throw new Error(
      "Canonical Transaction History returned an invalid history count."
    );
  }

  return {
    brokerLinkId:
      clean(data?.brokerLinkId),

    brokerAccountKey:
      upper(
        data?.brokerAccountKey
      ) || null,

    authorityEstablished:
      data?.authorityEstablished ===
      true,

    currentGeneration:
      data?.currentGeneration ??
      null,

    count,

    history
  };
}

export async function resolveAndLoadCanonicalBrokerTransactionHistory({
  brokerAccount = {},
  brokerAccountKey = ""
} = {}) {
  const brokerLink =
    await resolveAuthenticatedBrokerLink({
      brokerAccount,
      brokerAccountKey
    });

  const canonical =
    await loadCanonicalBrokerTransactionHistory({
      brokerLinkId:
        brokerLink.brokerLinkId
    });

  const requestedIdentity =
    brokerIdentityFromLocalAccount(
      brokerAccount,
      brokerAccountKey
    );

  const canonicalIdentity =
    parseBrokerAccountKey(
      canonical.brokerAccountKey
    );

  if (
    canonicalIdentity &&
    (
      canonicalIdentity.broker !==
        requestedIdentity.broker ||
      canonicalIdentity.clientNumber !==
        requestedIdentity.clientNumber
    )
  ) {
    throw new Error(
      "Canonical Transaction History does not belong to the selected broker account."
    );
  }

  return {
    brokerLink,
    canonical
  };
}

function cleanAppendValue(value) {
  return String(
    value ?? ""
  ).trim();
}

/*
 * R7O-R4E7R16 / R16R2
 *
 * Canonical authenticated Transaction History append transport.
 *
 * Pure execution mapping lives in:
 * transactionHistoryCanonicalMapper.js
 */

export async function appendCanonicalBrokerTransactionHistory({
  brokerLinkId,
  observedGeneration,
  executions
} = {}) {
  const resolvedBrokerLinkId =
    cleanAppendValue(
      brokerLinkId
    );

  if (!resolvedBrokerLinkId) {
    throw new Error(
      "brokerLinkId is required."
    );
  }

  const generation =
    Number(
      observedGeneration
    );

  if (
    !Number.isInteger(generation) ||
    generation < 1
  ) {
    throw new Error(
      "A valid observedGeneration is required."
    );
  }

  if (
    !Array.isArray(executions) ||
    executions.length === 0
  ) {
    throw new Error(
      "At least one canonical historical execution is required."
    );
  }

  const accessToken =
    await getStoredAccessToken();

  if (!accessToken) {
    throw new Error(
      "Authentication is required to append Transaction History."
    );
  }

  const response =
    await fetch(
      `${API_URL}/transactions/history`,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            brokerLinkId:
              resolvedBrokerLinkId,

            observedGeneration:
              generation,

            executions
          })
      }
    );

  let payload = null;

  try {
    payload =
      await response.json();
  } catch {
    payload = null;
  }

  if (
    !response.ok ||
    payload?.ok !== true
  ) {
    const error =
      new Error(
        payload?.error?.message ||
        "Canonical Transaction History append failed."
      );

    error.code =
      payload?.error?.code ||
      "TRANSACTION_HISTORY_APPEND_FAILED";

    error.status =
      response.status;

    throw error;
  }

  const result =
    payload?.append;

  if (
    !result ||
    typeof result !==
      "object"
  ) {
    throw new Error(
      "Canonical Transaction History append returned an invalid result."
    );
  }

  if (
    cleanAppendValue(
      result.brokerLinkId
    ) !==
    resolvedBrokerLinkId
  ) {
    throw new Error(
      "Canonical Transaction History append returned a different brokerLinkId."
    );
  }

  const insertedCount =
    Number(
      result.insertedCount
    );

  const existingCount =
    Number(
      result.existingCount
    );

  if (
    !Number.isInteger(insertedCount) ||
    insertedCount < 0 ||
    !Number.isInteger(existingCount) ||
    existingCount < 0
  ) {
    throw new Error(
      "Canonical Transaction History append returned invalid counts."
    );
  }

  return {
    ...result,
    insertedCount,
    existingCount
  };
}

/*
 * Compatibility exports for callers that consume Transaction
 * History functionality through this API module.
 */
export {
  mapVerifiedHistoryEvidenceForServer,
  mapVerifiedHistoryBatchForServer
} from "./transactionHistoryCanonicalMapper.js";
