import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Text,
  View
} from "react-native";
import { router } from "expo-router";

import { userGetItem } from "../src/auth/userStorage";
import { useAuth } from "../src/features/auth/hooks/useAuth";

export default function Index() {
  const {
    loading,
    isAuthenticated
  } = useAuth();

  useEffect(() => {
    if (!loading) {
      routeUser();
    }
  }, [loading, isAuthenticated]);

  async function routeUser() {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    try {
      const [
        profileRaw,
        dnaRaw,
        practiceRaw
      ] = await Promise.all([
        userGetItem("investorProfile"),
        userGetItem("investorDNA"),
        userGetItem("practicePortfolio")
      ]);

      const profile = parseStoredValue(profileRaw);
      const investorDNA = parseStoredValue(dnaRaw);
      const practicePortfolio = parseStoredValue(practiceRaw);

      /*
       * Stage 1:
       * Account exists but we do not yet know the investor's name.
       */
      const hasName =
        Boolean(profile?.firstName) ||
        Boolean(profile?.profile?.firstName);

      if (!hasName) {
        router.replace("/onboarding/name");
        return;
      }

      /*
       * Stage 2:
       * We know the investor's name, but Investor DNA
       * has not yet been completed.
       */
      const hasInvestorDNA =
        Boolean(investorDNA) ||
        Boolean(profile?.investorDNA) ||
        Boolean(profile?.profile?.dna);

      if (!hasInvestorDNA) {
        router.replace("/new-investor");
        return;
      }

      /*
       * Stage 3:
       * Investor DNA exists, but the Practice Portfolio
       * has not yet been built.
       */
      const hasPracticePortfolio =
        Boolean(practicePortfolio?.holdings?.length) ||
        Boolean(profile?.practicePortfolioCreated);

      if (!hasPracticePortfolio) {
        router.replace("/starter-plan");
        return;
      }

      /*
       * Stage 4:
       * Discovery + practice foundation complete.
       */
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error(
        "Unable to determine investor journey:",
        error
      );

      /*
       * Safe fallback.
       */
      router.replace("/onboarding/name");
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#020617",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <ActivityIndicator
        size="large"
        color="#67e8f9"
      />

      <Text
        style={{
          color: "#94a3b8",
          marginTop: 12
        }}
      >
        Preparing your GateCEP journey...
      </Text>
    </View>
  );
}

function parseStoredValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}