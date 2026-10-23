import { Platform } from "react-native";
import { API_URL } from "../../../config/apiConfig";

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      error: text || "Invalid server response"
    };
  }
}

export async function loadAdminOverview(accessToken) {
  if (!accessToken) {
    throw new Error("Authentication is required.");
  }

  const response = await fetch(
    `${API_URL}/admin/overview`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const data = await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error = new Error(
      data.error || "Admin access could not be verified."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}


export async function changeAdminUserRole({
  accessToken,
  userId,
  role,
  reason
}) {
  if (!accessToken) {
    throw new Error("Authentication is required.");
  }

  const targetUserId =
    String(userId || "").trim();

  const requestedRole =
    String(role || "")
      .trim()
      .toUpperCase();

  const administrativeReason =
    String(reason || "").trim();

  if (!targetUserId) {
    throw new Error("Target user is required.");
  }

  if (
    requestedRole !== "USER" &&
    requestedRole !== "ADMIN"
  ) {
    throw new Error(
      "Role must be USER or ADMIN."
    );
  }

  if (!administrativeReason) {
    throw new Error(
      "Administrative reason is required."
    );
  }

  const response = await fetch(
    `${API_URL}/admin/users/${encodeURIComponent(
      targetUserId
    )}/role`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        role: requestedRole,
        reason: administrativeReason
      })
    }
  );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error = new Error(
      data.message ||
      data.error ||
      "User role could not be changed."
    );

    error.status = response.status;
    error.code =
      data.error || null;

    throw error;
  }

  return data.user;
}

export async function changeAdminUserStatus({
  accessToken,
  userId,
  status,
  reason
}) {
  if (!accessToken) {
    throw new Error("Authentication is required.");
  }

  const targetUserId =
    String(userId || "").trim();

  const requestedStatus =
    String(status || "")
      .trim()
      .toUpperCase();

  const administrativeReason =
    String(reason || "").trim();

  if (!targetUserId) {
    throw new Error("Target user is required.");
  }

  if (
    requestedStatus !== "ACTIVE" &&
    requestedStatus !== "DISABLED"
  ) {
    throw new Error(
      "Status must be ACTIVE or DISABLED."
    );
  }

  if (!administrativeReason) {
    throw new Error(
      "Administrative reason is required."
    );
  }

  const response = await fetch(
    `${API_URL}/admin/users/${encodeURIComponent(
      targetUserId
    )}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        status: requestedStatus,
        reason: administrativeReason
      })
    }
  );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error = new Error(
      data.message ||
      data.error ||
      "User account status could not be changed."
    );

    error.status = response.status;
    error.code =
      data.error || null;

    throw error;
  }

  return data.user;
}

export async function loadAdminUsers(accessToken) {
  if (!accessToken) {
    throw new Error("Authentication is required.");
  }

  const response = await fetch(
    `${API_URL}/admin/users`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const data = await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error = new Error(
      data.error || "User directory could not be loaded."
    );

    error.status = response.status;
    throw error;
  }

  return Array.isArray(data.users)
    ? data.users
    : [];
}


export async function loadAdminReconciliationTargets(
  accessToken
) {
  if (!accessToken) {
    throw new Error(
      "Authentication is required."
    );
  }

  const response =
    await fetch(
      `${API_URL}/admin/reconciliation-targets`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        }
      }
    );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error =
      new Error(
        data.message ||
        data.error ||
        "Reconciliation targets could not be loaded."
      );

    error.status =
      response.status;

    error.code =
      data.error || null;

    throw error;
  }

  return Array.isArray(data.targets)
    ? data.targets
    : [];
}


export async function loadAdminTargetBrokerLinks(
  accessToken,
  targetUserId
) {
  if (!accessToken) {
    throw new Error(
      "Authentication is required."
    );
  }

  const normalizedTargetUserId =
    String(targetUserId || "").trim();

  if (!normalizedTargetUserId) {
    throw new Error(
      "Reconciliation target user is required."
    );
  }

  const response =
    await fetch(
      `${API_URL}/admin/reconciliation-targets/${encodeURIComponent(
        normalizedTargetUserId
      )}/broker-links`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        }
      }
    );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error =
      new Error(
        data.message ||
        data.error ||
        "Target broker accounts could not be loaded."
      );

    error.status =
      response.status;

    error.code =
      data.error || null;

    throw error;
  }

  return {
    target:
      data.target || null,
    brokers:
      Array.isArray(data.brokers)
        ? data.brokers
        : []
  };
}




export async function previewAdminReconciliationExecutionEvidence({
  accessToken,
  targetUserId,
  brokerLinkId,
  file
}) {
  if (!accessToken) {
    throw new Error(
      "Authentication is required."
    );
  }

  const normalizedTargetUserId =
    String(targetUserId || "").trim();

  const normalizedBrokerLinkId =
    String(brokerLinkId || "").trim();

  if (!normalizedTargetUserId) {
    throw new Error(
      "Reconciliation target user is required."
    );
  }

  if (!normalizedBrokerLinkId) {
    throw new Error(
      "Target broker account is required."
    );
  }

  if (!file) {
    throw new Error(
      "Transaction history file is required."
    );
  }

  const formData =
    new FormData();

  if (
    Platform.OS === "web" &&
    file.file
  ) {
    formData.append(
      "file",
      file.file,
      file.name ||
        "transaction-history"
    );
  } else {
    formData.append(
      "file",
      {
        uri: file.uri,
        name:
          file.name ||
          "transaction-history",
        type:
          file.mimeType ||
          "application/octet-stream"
      }
    );
  }

  const response =
    await fetch(
      `${API_URL}/admin/reconciliation-targets/${encodeURIComponent(
        normalizedTargetUserId
      )}/broker-links/${encodeURIComponent(
        normalizedBrokerLinkId
      )}/execution-evidence-preview`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        },
        body: formData
      }
    );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error =
      new Error(
        data.message ||
        data.error ||
        "Transaction history preview could not be created."
      );

    error.status =
      response.status;

    error.code =
      data.error || null;

    throw error;
  }

  return data;
}


export async function previewAdminReconciliationEvidence({
  accessToken,
  targetUserId,
  brokerLinkId,
  file,
  reportType = ""
}) {
  if (!accessToken) {
    throw new Error(
      "Authentication is required."
    );
  }

  const normalizedTargetUserId =
    String(targetUserId || "").trim();

  const normalizedBrokerLinkId =
    String(brokerLinkId || "").trim();

  const normalizedReportType =
    String(reportType || "")
      .trim()
      .toLowerCase();

  if (!normalizedTargetUserId) {
    throw new Error(
      "Reconciliation target user is required."
    );
  }

  if (!normalizedBrokerLinkId) {
    throw new Error(
      "Target broker account is required."
    );
  }

  if (!file) {
    throw new Error(
      "Broker evidence file is required."
    );
  }

  const formData =
    new FormData();

  if (normalizedReportType) {
    formData.append(
      "reportType",
      normalizedReportType
    );
  }

  if (
    Platform.OS === "web" &&
    file.file
  ) {
    formData.append(
      "file",
      file.file,
      file.name || "broker-evidence"
    );
  } else {
    formData.append(
      "file",
      {
        uri: file.uri,
        name:
          file.name ||
          "broker-evidence",
        type:
          file.mimeType ||
          "application/octet-stream"
      }
    );
  }

  const response =
    await fetch(
      `${API_URL}/admin/reconciliation-targets/${encodeURIComponent(
        normalizedTargetUserId
      )}/broker-links/${encodeURIComponent(
        normalizedBrokerLinkId
      )}/evidence-preview`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        },
        body: formData
      }
    );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error =
      new Error(
        data.message ||
        data.error ||
        "Broker evidence preview could not be created."
      );

    error.status =
      response.status;

    error.code =
      data.error || null;

    throw error;
  }

  return data;
}



export async function loadAdminAuditEvents(
  accessToken,
  {
    limit = 100
  } = {}
) {
  if (!accessToken) {
    throw new Error(
      "Authentication is required."
    );
  }

  const parsedLimit =
    Number.parseInt(
      String(limit),
      10
    );

  const requestedLimit =
    Number.isInteger(parsedLimit)
      ? parsedLimit
      : 100;

  const response =
    await fetch(
      `${API_URL}/admin/audit-events?limit=${encodeURIComponent(
        requestedLimit
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`
        }
      }
    );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error =
      new Error(
        data.message ||
        data.error ||
        "Administrative audit history could not be loaded."
      );

    error.status =
      response.status;

    error.code =
      data.error || null;

    throw error;
  }

  return Array.isArray(data.events)
    ? data.events
    : [];
}


export async function commitAdminBrokerReconciliation({
  accessToken,
  targetUserId,
  brokerLinkId,
  valuationReceiptId,
  cashReceiptId,
  reason,
  confirmed
}) {
  if (!accessToken) {
    throw new Error(
      "Authentication is required."
    );
  }

  const targetId =
    String(targetUserId || "").trim();

  const brokerId =
    String(brokerLinkId || "").trim();

  const valuationId =
    String(valuationReceiptId || "").trim();

  const cashId =
    String(cashReceiptId || "").trim();

  const normalizedReason =
    String(reason || "").trim();

  if (!targetId) {
    throw new Error(
      "Reconciliation target user is required."
    );
  }

  if (!brokerId) {
    throw new Error(
      "Target broker account is required."
    );
  }

  if (!valuationId) {
    throw new Error(
      "Verified valuation evidence is required."
    );
  }

  if (!cashId) {
    throw new Error(
      "Verified cash evidence is required."
    );
  }

  if (!normalizedReason) {
    throw new Error(
      "Reconciliation reason is required."
    );
  }

  if (confirmed !== true) {
    throw new Error(
      "Explicit confirmation is required."
    );
  }

  const response =
    await fetch(
      `${API_URL}/admin/reconciliation-targets/${encodeURIComponent(
        targetId
      )}/broker-links/${encodeURIComponent(
        brokerId
      )}/commit`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          valuationReceiptId:
            valuationId,
          cashReceiptId:
            cashId,
          reason:
            normalizedReason,
          confirmed: true
        })
      }
    );

  const data =
    await readJsonResponse(response);

  if (!response.ok || !data.ok) {
    const error =
      new Error(
        data.message ||
        data.error ||
        "Admin broker reconciliation commit failed."
      );

    error.status =
      response.status;

    error.code =
      data.error || null;

    throw error;
  }

  return data.reconciliation || null;
}
