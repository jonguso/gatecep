import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { router } from "expo-router";

import {
  MobileHeader,
  MobileScreen
} from "../src/components/mobile/MobileUI";

import { useAuth } from "../src/features/auth/hooks/useAuth";

import {
  loadAdminOverview
} from "../src/features/admin/api/adminApi";

const WORKSPACES = [
  {
    title: "Access & Security",
    detail:
      "Review GateCEP accounts and current authorization roles.",
    route: "/admin-users"
  },
  {
    title: "Fundamentals & Evidence",
    detail:
      "Manage issuer filings, evidence extraction, review, approval, and fundamental data.",
    route: "/fundamental-data-hub"
  },
  {
    title: "Market Data Operations",
    detail:
      "Open the restricted market price import workspace.",
    route: "/market-price-import"
  },
  {
    title: "Broker & Data Reconciliation",
    detail:
      "Support an investor through broker evidence and reconciliation without impersonating their account.",
    route: "/admin-broker-reconciliation"
  },
  {
    title: "System & Execution Audit",
    detail:
      "Review the existing execution audit workspace.",
    route: "/execution-audit"
  }
];

export default function AdminOperationsConsole() {
  const {
    accessToken,
    user,
    loading: authLoading
  } = useAuth();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  const verifyAccess = useCallback(async () => {
    if (!accessToken) {
      setAuthorized(false);
      setError("Authentication is required.");
      setChecking(false);
      return;
    }

    setChecking(true);
    setError("");

    try {
      const result =
        await loadAdminOverview(accessToken);

      const verified =
        result?.admin === true &&
        String(result?.user?.role || "")
          .trim()
          .toUpperCase() === "ADMIN";

      setAuthorized(verified);

      if (!verified) {
        setError(
          "Administrator authorization could not be verified."
        );
      }
    } catch (accessError) {
      setAuthorized(false);

      if (accessError?.status === 401) {
        setError(
          "Your authenticated session is no longer valid."
        );
      } else if (accessError?.status === 403) {
        setError(
          "This account is not authorized for GateCEP operations."
        );
      } else {
        setError(
          accessError?.message ||
          "Admin access could not be verified."
        );
      }
    } finally {
      setChecking(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!authLoading) {
      verifyAccess();
    }
  }, [authLoading, verifyAccess]);

  if (authLoading || checking) {
    return (
      <MobileScreen testID="gatecep-admin-console">
        <MobileHeader
          title="Operations Console"
          subtitle="Verifying administrative access."
          onBack={() => router.back()}
        />

        <View style={styles.statusCard}>
          <ActivityIndicator />
          <Text style={styles.statusText}>
            Verifying server authorization…
          </Text>
        </View>
      </MobileScreen>
    );
  }

  if (!authorized) {
    return (
      <MobileScreen testID="gatecep-admin-console">
        <MobileHeader
          title="Operations Console"
          subtitle="Administrative access required."
          onBack={() => router.back()}
          actionLabel="Home"
          onAction={() =>
            router.replace("/(tabs)/dashboard")
          }
        />

        <View style={styles.deniedCard}>
          <Text style={styles.deniedTitle}>
            Access unavailable
          </Text>

          <Text style={styles.deniedText}>
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={verifyAccess}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              Verify Again
            </Text>
          </Pressable>
        </View>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen testID="gatecep-admin-console">
      <MobileHeader
        title="Operations Console"
        subtitle="Privileged GateCEP operational workspaces."
        onBack={() => router.back()}
        actionLabel="Home"
        onAction={() =>
          router.replace("/(tabs)/dashboard")
        }
      />

      <View style={styles.identityCard}>
        <Text style={styles.identityLabel}>
          Server authorization
        </Text>

        <Text style={styles.identityValue}>
          ADMIN verified
        </Text>

        <Text style={styles.identityDetail}>
          {user?.email || user?.username || "Authenticated administrator"}
        </Text>
      </View>

      <View style={styles.workspaceList}>
        {WORKSPACES.map((workspace) => (
          <Pressable
            accessibilityRole="button"
            key={workspace.title}
            onPress={() =>
              router.push(workspace.route)
            }
            style={({ pressed }) => [
              styles.workspaceCard,
              pressed && styles.workspacePressed
            ]}
          >
            <View style={styles.workspaceCopy}>
              <Text style={styles.workspaceTitle}>
                {workspace.title}
              </Text>

              <Text style={styles.workspaceDetail}>
                {workspace.detail}
              </Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>
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

  deniedCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,.35)",
    backgroundColor: "rgba(239,68,68,.08)",
    padding: 18
  },

  deniedTitle: {
    color: "#fca5a5",
    fontSize: 18,
    fontWeight: "900"
  },

  deniedText: {
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

  identityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,211,238,.32)",
    backgroundColor: "rgba(34,211,238,.08)",
    padding: 16,
    marginBottom: 14
  },

  identityLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },

  identityValue: {
    color: "#67e8f9",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 4
  },

  identityDetail: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 5
  },

  workspaceList: {
    gap: 10
  },

  workspaceCard: {
    minHeight: 78,
    padding: 14,
    borderRadius: 15,
    backgroundColor: "#020617",
    borderColor: "#1e293b",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  workspacePressed: {
    backgroundColor: "#1e293b",
    borderColor: "#67e8f9"
  },

  workspaceCopy: {
    flex: 1
  },

  workspaceTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },

  workspaceDetail: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4
  },

  arrow: {
    color: "#67e8f9",
    fontSize: 24,
    fontWeight: "900"
  }
});
