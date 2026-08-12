import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { router, useFocusEffect } from "expo-router";

import {
  loadCurrentCoachGReconciliationConversation
} from "../coachGReconciliationConversationService";

export default function CoachGReconciliationCard({ compact = true, showWhenNotRequired = false }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function load() {
        try {
          setLoading(true);
          const next =
            await loadCurrentCoachGReconciliationConversation();

          if (mounted) {
            setResult(next);
          }
        } catch (error) {
          console.log(
            "Coach G reconciliation card load error:",
            error?.message
          );

          if (mounted) {
            setResult(null);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }

      load();

      return () => {
        mounted = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator />
        <Text style={styles.small}>
          Coach G is reviewing your recent real investing activity...
        </Text>
      </View>
    );
  }

  const conversation = result?.conversation;

  if (!conversation || conversation?.state === "NOT_REQUIRED") {
    if (!showWhenNotRequired) {
      return null;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>COACH G CHECK-IN</Text>

        <Text style={styles.title}>
          Review your real investing journey
        </Text>

        <Text style={styles.body}>
          There is no unresolved reconciliation issue right now. You can still open Coach G's check-in to review whether your real investing activity remains aligned with your goals and Investor DNA.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() =>
            router.push("/reconciliation-conversation")
          }
        >
          <Text style={styles.buttonText}>
            Open Coach G Check-in
          </Text>
        </Pressable>
      </View>
    );
  }

  const prompt = conversation?.prompt || {};

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>COACH G CHECK-IN</Text>
          <Text style={styles.title}>
            {conversation?.activeSignal?.title ||
              "Something worth discussing"}
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {conversation?.activeSignal?.level || "REVIEW"}
          </Text>
        </View>
      </View>

      <Text style={styles.body}>
        {prompt?.observation || conversation?.summary}
      </Text>

      {!compact && prompt?.whyItMatters ? (
        <Text style={styles.small}>
          {prompt.whyItMatters}
        </Text>
      ) : null}

      <Text style={styles.question}>
        {prompt?.question || "What changed, if anything?"}
      </Text>

      <Pressable
        style={styles.button}
        onPress={() => router.push("/reconciliation-conversation")}
      >
        <Text style={styles.buttonText}>
          Talk with Coach G
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    gap: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: "#67e8f9"
  },
  title: {
    marginTop: 4,
    color: "#f8fafc",
    fontWeight: "900",
    fontSize: 18
  },
  body: {
    color: "#cbd5e1",
    lineHeight: 21
  },
  question: {
    color: "#f8fafc",
    fontWeight: "800",
    lineHeight: 21
  },
  small: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18
  },
  badge: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  badgeText: {
    color: "#facc15",
    fontWeight: "900",
    fontSize: 10
  },
  button: {
    backgroundColor: "#0891b2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900"
  }
});
