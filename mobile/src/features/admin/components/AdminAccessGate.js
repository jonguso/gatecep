import React from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  useAdminAuthorization
} from "../hooks/useAdminAuthorization";

/*
 * ============================================================
 * ADMIN-004B7
 * SHARED ADMIN ACCESS GATE
 * ============================================================
 *
 * Reusable fail-closed authorization boundary for privileged
 * GateCEP operational workspaces.
 *
 * Backend authorization remains authoritative through
 * useAdminAuthorization -> loadAdminOverview.
 * ============================================================
 */

export function AdminAccessGate({
  children,
  testID = "gatecep-admin-access-gate"
}) {
  const {
    authLoading,
    checking,
    authorized,
    error,
    verifyAdminAccess
  } = useAdminAuthorization();

  if (authLoading || checking) {
    return (
      <View
        testID={`${testID}-checking`}
        style={styles.screen}
      >
        <ActivityIndicator />

        <Text style={styles.statusText}>
          Verifying administrator authorization…
        </Text>
      </View>
    );
  }

  if (!authorized) {
    return (
      <View
        testID={`${testID}-denied`}
        style={styles.screen}
      >
        <Text style={styles.title}>
          Access unavailable
        </Text>

        <Text style={styles.message}>
          {error ||
            "This workspace requires GateCEP administrator authorization."}
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={verifyAdminAccess}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>
            Verify Again
          </Text>
        </Pressable>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    minHeight: 320,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },

  statusText: {
    color: "#94a3b8",
    marginTop: 14,
    textAlign: "center"
  },

  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 12,
    textAlign: "center"
  },

  message: {
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
    maxWidth: 520
  },

  retryButton: {
    borderWidth: 1,
    borderColor: "#22d3ee",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12
  },

  retryText: {
    color: "#67e8f9",
    fontWeight: "800"
  }
});

export default AdminAccessGate;
