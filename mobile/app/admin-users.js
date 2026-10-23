import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { router } from "expo-router";

import {
  MobileHeader,
  MobileScreen
} from "../src/components/mobile/MobileUI";

import { useAuth } from "../src/features/auth/hooks/useAuth";

import {
  changeAdminUserRole,
  changeAdminUserStatus,
  loadAdminUsers
} from "../src/features/admin/api/adminApi";

function formatDate(value) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleDateString();
}

export default function AdminUsersScreen() {
  const {
    accessToken,
    loading: authLoading
  } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roleEditor, setRoleEditor] =
    useState(null);

  const [roleReason, setRoleReason] =
    useState("");

  const [roleSubmitting, setRoleSubmitting] =
    useState(false);

  const [roleFeedback, setRoleFeedback] =
    useState("");

  const [statusEditor, setStatusEditor] =
    useState(null);

  const [statusReason, setStatusReason] =
    useState("");

  const [statusSubmitting, setStatusSubmitting] =
    useState(false);

  const [statusFeedback, setStatusFeedback] =
    useState("");

  const loadDirectory = useCallback(async () => {
    if (!accessToken) {
      setUsers([]);
      setError("Authentication is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result =
        await loadAdminUsers(accessToken);

      setUsers(result);
    } catch (loadError) {
      setUsers([]);

      if (loadError?.status === 401) {
        setError(
          "Your authenticated session is no longer valid."
        );
      } else if (loadError?.status === 403) {
        setError(
          "This account is not authorized to view the user directory."
        );
      } else {
        setError(
          loadError?.message ||
          "User directory could not be loaded."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!authLoading) {
      loadDirectory();
    }
  }, [authLoading, loadDirectory]);

  function beginRoleChange(entry) {
    if (
      roleSubmitting ||
      statusSubmitting ||
      statusEditor
    ) {
      return;
    }

    const currentRole =
      String(entry?.role || "USER")
        .trim()
        .toUpperCase();

    const requestedRole =
      currentRole === "ADMIN"
        ? "USER"
        : "ADMIN";

    setRoleEditor({
      userId: entry?.id,
      username: entry?.username || "",
      email: entry?.email || "",
      currentRole,
      requestedRole
    });

    setRoleReason("");
    setRoleFeedback("");
  }

  function cancelRoleChange() {
    if (roleSubmitting) {
      return;
    }

    setRoleEditor(null);
    setRoleReason("");
    setRoleFeedback("");
  }

  async function confirmRoleMutation({
    title,
    message
  }) {
    if (
      typeof window !== "undefined" &&
      typeof window.confirm === "function"
    ) {
      return window.confirm(
        `${title}\n\n${message}`
      );
    }

    return new Promise((resolve) => {
      let settled = false;

      const finish = (value) => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(value);
      };

      Alert.alert(
        title,
        message,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => finish(false)
          },
          {
            text: "Confirm",
            onPress: () => finish(true)
          }
        ],
        {
          cancelable: true,
          onDismiss: () => finish(false)
        }
      );
    });
  }

  function beginStatusChange(entry) {
    if (
      statusSubmitting ||
      roleSubmitting ||
      roleEditor
    ) {
      return;
    }

    const currentStatus =
      String(entry?.status || "ACTIVE")
        .trim()
        .toUpperCase();

    const requestedStatus =
      currentStatus === "DISABLED"
        ? "ACTIVE"
        : "DISABLED";

    setStatusEditor({
      userId: entry?.id,
      username: entry?.username || "",
      email: entry?.email || "",
      currentStatus,
      requestedStatus
    });

    setStatusReason("");
    setStatusFeedback("");
  }

  function cancelStatusChange() {
    if (statusSubmitting) {
      return;
    }

    setStatusEditor(null);
    setStatusReason("");
    setStatusFeedback("");
  }

  async function submitStatusChange() {
    if (
      statusSubmitting ||
      !statusEditor
    ) {
      return;
    }

    const reason =
      String(statusReason || "").trim();

    if (!reason) {
      setStatusFeedback(
        "Administrative reason is required."
      );
      return;
    }

    const identity =
      statusEditor.username ||
      statusEditor.email ||
      "this account";

    const confirmed =
      await confirmRoleMutation({
        title:
          statusEditor.requestedStatus === "DISABLED"
            ? "Confirm Account Disable"
            : "Confirm Account Enable",
        message:
          `Change ${identity} from ` +
          `${statusEditor.currentStatus} to ` +
          `${statusEditor.requestedStatus}?\n\n` +
          `Administrative reason:\n${reason}`
      });

    if (!confirmed) {
      return;
    }

    setStatusSubmitting(true);
    setStatusFeedback("");

    try {
      await changeAdminUserStatus({
        accessToken,
        userId: statusEditor.userId,
        status: statusEditor.requestedStatus,
        reason
      });

      /*
       * Server remains authoritative.
       * Do not optimistically mutate local status.
       */
      const refreshed =
        await loadAdminUsers(accessToken);

      setUsers(refreshed);
      setStatusEditor(null);
      setStatusReason("");

      setStatusFeedback(
        statusEditor.requestedStatus === "DISABLED"
          ? "Account disabled successfully."
          : "Account enabled successfully."
      );
    } catch (statusError) {
      if (statusError?.status === 401) {
        setStatusFeedback(
          "Authentication expired. Please sign in again."
        );
      } else if (statusError?.status === 403) {
        setStatusFeedback(
          statusError?.message ||
          "You are not authorized to change account status."
        );
      } else {
        setStatusFeedback(
          statusError?.message ||
          "User account status could not be changed."
        );
      }
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function submitRoleChange() {
    if (
      roleSubmitting ||
      !roleEditor
    ) {
      return;
    }

    const reason =
      String(roleReason || "").trim();

    if (!reason) {
      setRoleFeedback(
        "Administrative reason is required."
      );
      return;
    }

    const identity =
      roleEditor.username ||
      roleEditor.email ||
      "this account";

    const confirmed =
      await confirmRoleMutation({
        title: "Confirm Role Change",
        message:
          `Change ${identity} from ` +
          `${roleEditor.currentRole} to ` +
          `${roleEditor.requestedRole}?\n\n` +
          `Administrative reason:\n${reason}`
      });

    if (!confirmed) {
      return;
    }

    setRoleSubmitting(true);
    setRoleFeedback("");

    try {
      await changeAdminUserRole({
        accessToken,
        userId: roleEditor.userId,
        role: roleEditor.requestedRole,
        reason
      });

      /*
       * Server remains authoritative.
       * Do not optimistically mutate the local role.
       */
      const refreshed =
        await loadAdminUsers(accessToken);

      setUsers(refreshed);
      setRoleEditor(null);
      setRoleReason("");

      setRoleFeedback(
        "Role changed successfully."
      );
    } catch (roleError) {
      if (roleError?.status === 401) {
        setRoleFeedback(
          "Authentication expired. Please sign in again."
        );
      } else if (roleError?.status === 403) {
        setRoleFeedback(
          "You are not authorized to change account roles."
        );
      } else {
        setRoleFeedback(
          roleError?.message ||
          "User role could not be changed."
        );
      }
    } finally {
      setRoleSubmitting(false);
    }
  }

  return (
    <MobileScreen testID="gatecep-admin-users">
      <MobileHeader
        title="User Administration"
        subtitle="Server-authorized GateCEP account directory."
        onBack={() => router.back()}
        actionLabel="Console"
        onAction={() => router.replace("/admin")}
      />

      {authLoading || loading ? (
        <View style={styles.statusCard}>
          <ActivityIndicator />

          <Text style={styles.statusText}>
            Loading authorized user directory…
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>
            Directory unavailable
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={loadDirectory}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              Try Again
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>
              Accounts
            </Text>

            <Text style={styles.summaryValue}>
              {users.length}
            </Text>

            <Text style={styles.summaryDetail}>
              Server-authorized directory · controlled role and account-access administration
            </Text>
          </View>

          {roleFeedback && !roleEditor ? (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>
                {roleFeedback}
              </Text>
            </View>
          ) : null}

          {statusFeedback && !statusEditor ? (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>
                {statusFeedback}
              </Text>
            </View>
          ) : null}

          <Pressable
            testID="admin-audit-history-link"
            accessibilityRole="button"
            onPress={() =>
              router.push("/admin-audit-history")
            }
            style={styles.auditHistoryButton}
          >
            <View style={styles.auditHistoryCopy}>
              <Text style={styles.auditHistoryTitle}>
                Administrative Audit History
              </Text>

              <Text style={styles.auditHistoryDetail}>
                Review immutable server-side administrative evidence.
              </Text>
            </View>

            <Text style={styles.auditHistoryArrow}>
              ›
            </Text>
          </Pressable>

          <View style={styles.list}>
            {users.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  No accounts are available.
                </Text>
              </View>
            ) : (
              users.map((entry) => (
                <View
                  key={entry.id}
                  style={styles.userCard}
                >
                  <View style={styles.userTopRow}>
                    <View style={styles.userIdentity}>
                      <Text style={styles.username}>
                        {entry.username ||
                          "GateCEP user"}
                      </Text>

                      <Text style={styles.email}>
                        {entry.email ||
                          "Email unavailable"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.roleBadge,
                        entry.role === "ADMIN" &&
                          styles.adminBadge
                      ]}
                    >
                      <Text style={styles.roleText}>
                        {entry.role || "USER"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Created {formatDate(entry.createdAt)}
                    </Text>

                    <Text style={styles.metaText}>
                      Updated {formatDate(entry.updatedAt)}
                    </Text>
                  </View>

                  <View style={styles.accountStatusRow}>
                    <Text style={styles.accountStatusLabel}>
                      Account status
                    </Text>

                    <Text style={styles.accountStatusValue}>
                      {String(
                        entry.status || "ACTIVE"
                      ).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.adminActionRow}>
                    <Pressable
                      testID={`admin-change-role-${entry.id}`}
                      accessibilityRole="button"
                      disabled={
                        roleSubmitting ||
                        statusSubmitting ||
                        Boolean(statusEditor)
                      }
                      onPress={() =>
                        beginRoleChange(entry)
                      }
                      style={[
                        styles.changeRoleButton,
                        (
                          roleSubmitting ||
                          statusSubmitting ||
                          Boolean(statusEditor)
                        ) &&
                          styles.disabled
                      ]}
                    >
                      <Text style={styles.changeRoleText}>
                        Change Role
                      </Text>
                    </Pressable>

                    <Pressable
                      testID={`admin-change-status-${entry.id}`}
                      accessibilityRole="button"
                      disabled={
                        statusSubmitting ||
                        roleSubmitting ||
                        Boolean(roleEditor)
                      }
                      onPress={() =>
                        beginStatusChange(entry)
                      }
                      style={[
                        styles.changeStatusButton,
                        (
                          statusSubmitting ||
                          roleSubmitting ||
                          Boolean(roleEditor)
                        ) &&
                          styles.disabled
                      ]}
                    >
                      <Text style={styles.changeStatusText}>
                        {String(
                          entry.status || "ACTIVE"
                        ).toUpperCase() === "DISABLED"
                          ? "Enable Account"
                          : "Disable Account"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          {statusEditor ? (
            <View
              testID="admin-status-control"
              style={styles.statusControl}
            >
              <Text style={styles.statusControlTitle}>
                Change Account Access
              </Text>

              <Text style={styles.roleIdentity}>
                {statusEditor.username ||
                  statusEditor.email ||
                  "Selected account"}
              </Text>

              {statusEditor.email ? (
                <Text style={styles.roleEmail}>
                  {statusEditor.email}
                </Text>
              ) : null}

              <Text style={styles.statusTransition}>
                {statusEditor.currentStatus}
                {"  →  "}
                {statusEditor.requestedStatus}
              </Text>

              <Text style={styles.reasonLabel}>
                Administrative reason
              </Text>

              <TextInput
                testID="admin-status-reason"
                value={statusReason}
                onChangeText={setStatusReason}
                editable={!statusSubmitting}
                multiline
                placeholder="Explain why this account access change is required"
                placeholderTextColor="#64748b"
                style={styles.reasonInput}
              />

              {statusFeedback ? (
                <Text style={styles.roleFeedback}>
                  {statusFeedback}
                </Text>
              ) : null}

              <View style={styles.roleActions}>
                <Pressable
                  testID="admin-status-cancel"
                  accessibilityRole="button"
                  disabled={statusSubmitting}
                  onPress={cancelStatusChange}
                  style={[
                    styles.secondaryButton,
                    statusSubmitting &&
                      styles.disabled
                  ]}
                >
                  <Text style={styles.secondaryText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  testID="admin-status-confirm"
                  accessibilityRole="button"
                  disabled={
                    statusSubmitting ||
                    !String(
                      statusReason || ""
                    ).trim()
                  }
                  onPress={submitStatusChange}
                  style={[
                    styles.statusPrimaryButton,
                    (
                      statusSubmitting ||
                      !String(
                        statusReason || ""
                      ).trim()
                    ) &&
                      styles.disabled
                  ]}
                >
                  {statusSubmitting ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.primaryText}>
                      {statusEditor.requestedStatus ===
                      "DISABLED"
                        ? "Review & Confirm Disable"
                        : "Review & Confirm Enable"}
                    </Text>
                  )}
                </Pressable>
              </View>

              <Text style={styles.boundaryText}>
                This control changes account access status
                only. Role, email, username, password and
                login identity are not editable here.
              </Text>
            </View>
          ) : null}

          {roleEditor ? (
            <View
              testID="admin-role-control"
              style={styles.roleControl}
            >
              <Text style={styles.roleControlTitle}>
                Change Authorization Role
              </Text>

              <Text style={styles.roleIdentity}>
                {roleEditor.username ||
                  roleEditor.email ||
                  "Selected account"}
              </Text>

              {roleEditor.email ? (
                <Text style={styles.roleEmail}>
                  {roleEditor.email}
                </Text>
              ) : null}

              <Text style={styles.roleTransition}>
                {roleEditor.currentRole}
                {"  →  "}
                {roleEditor.requestedRole}
              </Text>

              <Text style={styles.reasonLabel}>
                Administrative reason
              </Text>

              <TextInput
                testID="admin-role-reason"
                value={roleReason}
                onChangeText={setRoleReason}
                editable={!roleSubmitting}
                multiline
                placeholder="Explain why this authorization change is required"
                placeholderTextColor="#64748b"
                style={styles.reasonInput}
              />

              {roleFeedback ? (
                <Text style={styles.roleFeedback}>
                  {roleFeedback}
                </Text>
              ) : null}

              <View style={styles.roleActions}>
                <Pressable
                  testID="admin-role-cancel"
                  accessibilityRole="button"
                  disabled={roleSubmitting}
                  onPress={cancelRoleChange}
                  style={[
                    styles.secondaryButton,
                    roleSubmitting &&
                      styles.disabled
                  ]}
                >
                  <Text style={styles.secondaryText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  testID="admin-role-confirm"
                  accessibilityRole="button"
                  disabled={
                    roleSubmitting ||
                    !String(
                      roleReason || ""
                    ).trim()
                  }
                  onPress={submitRoleChange}
                  style={[
                    styles.primaryButton,
                    (
                      roleSubmitting ||
                      !String(
                        roleReason || ""
                      ).trim()
                    ) &&
                      styles.disabled
                  ]}
                >
                  {roleSubmitting ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={styles.primaryText}>
                      Review & Confirm Role Change
                    </Text>
                  )}
                </Pressable>
              </View>

              <Text style={styles.boundaryText}>
                This control changes authorization role only.
                Email, username, password and login identity
                are not editable here.
              </Text>
            </View>
          ) : null}
        </>
      )}
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 20
  },

  statusText: {
    color: "#94a3b8",
    fontSize: 13
  },

  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,.35)",
    backgroundColor: "rgba(239,68,68,.08)",
    padding: 18
  },

  errorTitle: {
    color: "#fca5a5",
    fontSize: 18,
    fontWeight: "900"
  },

  errorText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8
  },

  retryButton: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#475569"
  },

  retryText: {
    color: "#e2e8f0",
    fontWeight: "900"
  },

  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,.32)",
    backgroundColor: "rgba(34,211,238,.08)",
    padding: 16,
    marginBottom: 14
  },

  summaryLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  summaryValue: {
    color: "#67e8f9",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4
  },

  summaryDetail: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 4
  },

  feedbackCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,.35)",
    backgroundColor: "rgba(34,197,94,.08)",
    padding: 12,
    marginBottom: 14
  },

  feedbackText: {
    color: "#86efac",
    fontSize: 12,
    fontWeight: "700"
  },

  list: {
    gap: 10
  },

  auditHistoryButton: {
    minHeight: 72,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#020617",
    padding: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  auditHistoryCopy: {
    flex: 1
  },

  auditHistoryTitle: {
    color: "#67e8f9",
    fontSize: 14,
    fontWeight: "900"
  },

  auditHistoryDetail: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4
  },

  auditHistoryArrow: {
    color: "#67e8f9",
    fontSize: 24,
    fontWeight: "900"
  },

  userCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    padding: 14
  },

  userTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },

  userIdentity: {
    flex: 1
  },

  username: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },

  email: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4
  },

  roleBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#475569",
    paddingHorizontal: 10,
    paddingVertical: 5
  },

  adminBadge: {
    borderColor: "#22d3ee"
  },

  roleText: {
    color: "#e2e8f0",
    fontSize: 10,
    fontWeight: "900"
  },

  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12
  },

  metaText: {
    color: "#64748b",
    fontSize: 10
  },

  accountStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12
  },

  accountStatusLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800"
  },

  accountStatusValue: {
    color: "#e2e8f0",
    fontSize: 10,
    fontWeight: "900"
  },

  adminActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },

  changeRoleButton: {
    minHeight: 40,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#22d3ee",
    paddingHorizontal: 14
  },

  changeRoleText: {
    color: "#67e8f9",
    fontSize: 12,
    fontWeight: "900"
  },

  changeStatusButton: {
    minHeight: 40,
    alignSelf: "flex-start",
    justifyContent: "center",
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f59e0b",
    paddingHorizontal: 14
  },

  changeStatusText: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "900"
  },

  statusControl: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#92400e",
    backgroundColor: "#020617",
    padding: 16
  },

  statusControlTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },

  statusTransition: {
    color: "#fbbf24",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 14
  },

  statusPrimaryButton: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#b45309",
    paddingHorizontal: 14
  },

  roleControl: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#020617",
    padding: 16
  },

  roleControlTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900"
  },

  roleIdentity: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 12
  },

  roleEmail: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 3
  },

  roleTransition: {
    color: "#67e8f9",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 14
  },

  reasonLabel: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 7
  },

  reasonInput: {
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#475569",
    color: "#f8fafc",
    padding: 11,
    textAlignVertical: "top"
  },

  roleFeedback: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10
  },

  roleActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },

  secondaryButton: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#64748b",
    paddingHorizontal: 14
  },

  secondaryText: {
    color: "#e2e8f0",
    fontWeight: "800"
  },

  primaryButton: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#0891b2",
    paddingHorizontal: 14
  },

  primaryText: {
    color: "#ffffff",
    fontWeight: "900"
  },

  disabled: {
    opacity: 0.45
  },

  boundaryText: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 14
  },

  emptyCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
    padding: 18
  },

  emptyText: {
    color: "#94a3b8",
    fontSize: 13
  }
});

