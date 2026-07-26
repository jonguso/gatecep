import React, {
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getStoredUser
} from "../src/features/auth/storage/authStorage";

import {
  getCurrentSession,
  getCurrentUserId
} from "../src/auth/authStore";

import {
  userGetItem,
  userSetItem
} from "../src/auth/userStorage";

export default function StorageDebug() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    repairing,
    setRepairing
  ] = useState(false);

  const [
    report,
    setReport
  ] = useState(null);

  useEffect(() => {
    inspectStorage();
  }, []);

  async function inspectStorage() {
    try {
      setLoading(true);

      const [
        authUser,
        legacySession,
        legacyUserId,
        allKeys
      ] = await Promise.all([
        getStoredUser(),
        getCurrentSession(),
        getCurrentUserId(),
        AsyncStorage.getAllKeys()
      ]);

      const relevantKeys =
        allKeys
          .filter(
            (key) =>
              key.includes(
                "investorProfile"
              ) ||
              key.includes(
                "investorDNA"
              ) ||
              key.includes(
                "wealthBlueprint"
              ) ||
              key.includes(
                "practicePortfolio"
              ) ||
              key.includes(
                "coachGMonthlyReviews") ||
              key.includes(
                "practiceDecisionJournal"
              ) ||
              key ===
                "gatecep.auth.user" ||
              key ===
                "gatecepSession" ||
              key ===
                "gatecepCurrentUserId"
          )
          .sort();

      const values = {};

      for (
        const key of relevantKeys
      ) {
        const raw =
          await AsyncStorage.getItem(
            key
          );

        values[key] =
          raw
            ? raw.slice(
                0,
                1000
              )
            : null;
      }

      setReport({
        authUser,
        legacySession,
        legacyUserId,
        relevantKeys,
        values
      });
    } catch (error) {
      setReport({
        error:
          error?.message ||
          "Unable to inspect storage."
      });
    } finally {
      setLoading(false);
    }
  }

  async function repairPracticePortfolio() {
    try {
      setRepairing(true);

      const currentUserId =
        await getCurrentUserId();

      if (!currentUserId) {
        throw new Error(
          "No authenticated user namespace is available."
        );
      }

      const raw =
        await userGetItem(
          "practicePortfolio"
        );

      if (!raw) {
        throw new Error(
          "No Practice Portfolio was found for the current user."
        );
      }

      const existingPortfolio =
        typeof raw === "string"
          ? JSON.parse(raw)
          : raw;

      const startingAmount =
        Number(
          existingPortfolio
            ?.startingAmount ||
            0
        );

      const investedAmount =
        Number(
          existingPortfolio
            ?.investedAmount ||
            0
        );

      if (
        !Number.isFinite(
          startingAmount
        ) ||
        startingAmount <= 0
      ) {
        throw new Error(
          "Practice Portfolio starting amount is invalid."
        );
      }

      if (
        !Number.isFinite(
          investedAmount
        ) ||
        investedAmount < 0
      ) {
        throw new Error(
          "Practice Portfolio invested amount is invalid."
        );
      }

      const correctedAvailableCash =
        Number(
          Math.max(
            0,
            startingAmount -
              investedAmount
          ).toFixed(2)
        );

      const existingAvailableCash =
        Number(
          existingPortfolio
            ?.availableCash ||
            0
        );

      const repairedPortfolio = {
        ...existingPortfolio,

        startingAmount:
          Number(
            startingAmount.toFixed(
              2
            )
          ),

        investedAmount:
          Number(
            investedAmount.toFixed(
              2
            )
          ),

        availableCash:
          correctedAvailableCash,

        accountingReconciled:
          true,

        accountingReconciledAt:
          new Date().toISOString(),

        updatedAt:
          new Date().toISOString()
      };

      await userSetItem(
        "practicePortfolio",
        JSON.stringify(
          repairedPortfolio
        )
      );

      /*
       * Keep the user-scoped compatibility cash value
       * aligned with the canonical Practice Portfolio.
       */
      await userSetItem(
        "availableCash",
        String(
          correctedAvailableCash
        )
      );

      console.log(
        "PRACTICE PORTFOLIO ACCOUNTING REPAIR:",
        {
          currentUserId,
          startingAmount,
          investedAmount,
          previousAvailableCash:
            existingAvailableCash,
          correctedAvailableCash
        }
      );

      await inspectStorage();

      Alert.alert(
        "Practice Portfolio Repaired",
        `Starting Amount: KES ${money(
          startingAmount
        )}\n` +
          `Invested: KES ${money(
            investedAmount
          )}\n` +
          `Previous Cash: KES ${money(
            existingAvailableCash
          )}\n` +
          `Corrected Cash: KES ${money(
            correctedAvailableCash
          )}`
      );
    } catch (error) {
      console.error(
        "Unable to repair Practice Portfolio:",
        error
      );

      Alert.alert(
        "Repair Failed",
        error?.message ||
          "Unable to repair the Practice Portfolio."
      );
    } finally {
      setRepairing(false);
    }
  }

  if (loading) {
    return (
      <View
        style={styles.center}
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={
        styles.content
      }
    >
      <Text
        style={styles.title}
      >
        GateCEP Storage Diagnostic
      </Text>

      <Section
        label="Authenticated API User"
        value={
          report?.authUser
        }
      />

      <Section
        label="Legacy Session"
        value={
          report?.legacySession
        }
      />

      <Section
        label="Current Namespace ID"
        value={
          report?.legacyUserId
        }
      />

      <View
        style={
          styles.repairCard
        }
      >
        <Text
          style={
            styles.repairTitle
          }
        >
          Practice Portfolio
          Accounting Repair
        </Text>

        <Text
          style={
            styles.repairText
          }
        >
          Reconcile the current
          user's Practice Portfolio
          so starting capital equals
          invested holdings plus
          available cash.
        </Text>

        <Pressable
          style={[
            styles.repairButton,
            repairing &&
              styles.disabled
          ]}
          disabled={repairing}
          onPress={
            repairPracticePortfolio
          }
        >
          {repairing ? (
            <ActivityIndicator
              color="white"
            />
          ) : (
            <Text
              style={
                styles.repairButtonText
              }
            >
              Repair Practice
              Portfolio Accounting
            </Text>
          )}
        </Pressable>
      </View>

      <Text
        style={
          styles.sectionTitle
        }
      >
        Relevant Storage Keys
      </Text>

      {(
        report?.relevantKeys ||
        []
      ).map((key) => (
        <View
          key={key}
          style={styles.card}
        >
          <Text
            style={styles.key}
          >
            {key}
          </Text>

          <Text
            style={styles.value}
          >
            {report?.values?.[
              key
            ] || "EMPTY"}
          </Text>
        </View>
      ))}

      {report?.error ? (
        <Text
          style={styles.error}
        >
          {report.error}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Section({
  label,
  value
}) {
  return (
    <View
      style={styles.card}
    >
      <Text
        style={styles.label}
      >
        {label}
      </Text>

      <Text
        style={styles.value}
      >
        {JSON.stringify(
          value,
          null,
          2
        )}
      </Text>
    </View>
  );
}

function money(value) {
  return Number(
    value || 0
  ).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        "#020617"
    },

    content: {
      padding: 22,
      paddingTop: 70,
      paddingBottom: 100
    },

    center: {
      flex: 1,
      backgroundColor:
        "#020617",
      alignItems:
        "center",
      justifyContent:
        "center"
    },

    title: {
      color: "white",
      fontSize: 28,
      fontWeight: "900",
      marginBottom: 18
    },

    sectionTitle: {
      color: "#67e8f9",
      fontSize: 18,
      fontWeight: "900",
      marginTop: 20,
      marginBottom: 8
    },

    card: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginTop: 10
    },

    repairCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",
      borderColor:
        "rgba(34,197,94,.35)",
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      marginTop: 18
    },

    repairTitle: {
      color: "#86efac",
      fontSize: 18,
      fontWeight: "900"
    },

    repairText: {
      color: "#bbf7d0",
      lineHeight: 21,
      marginTop: 8
    },

    repairButton: {
      backgroundColor:
        "#16a34a",
      padding: 16,
      borderRadius: 14,
      marginTop: 16
    },

    repairButtonText: {
      color: "white",
      textAlign: "center",
      fontWeight: "900"
    },

    disabled: {
      opacity: 0.6
    },

    label: {
      color: "#c084fc",
      fontWeight: "900",
      marginBottom: 8
    },

    key: {
      color: "#67e8f9",
      fontWeight: "900"
    },

    value: {
      color: "#cbd5e1",
      fontFamily:
        "monospace",
      marginTop: 8
    },

    error: {
      color: "#fca5a5",
      marginTop: 20
    }
  });