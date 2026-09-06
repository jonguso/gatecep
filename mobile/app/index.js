import React, { useEffect } from "react";

import {
  ActivityIndicator,
  Text,
  View
} from "react-native";

import { router } from "expo-router";

import {
  useAuth
} from "../src/features/auth/hooks/useAuth";

import {
  loadInvestorContext
} from "../src/features/investor/investorContextStore";

import {
  getCurrentUserId
} from "../src/auth/authStore";
import {
  saveProfile
} from "../src/utils/onboardingStorage";
import {
  restoreInvestorProfileFromCloud
} from "../src/features/profile/api/investorProfileApi";


function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/*
 * Authentication and namespace restoration happen asynchronously.
 *
 * Wait briefly for gatecepCurrentUserId before reading
 * user-scoped investor data.
 */
async function waitForUserNamespace({
  attempts = 20,
  interval = 100
} = {}) {
  for (
    let attempt = 0;
    attempt < attempts;
    attempt += 1
  ) {
    const userId =
      await getCurrentUserId();

    if (userId) {
      return userId;
    }

    await delay(interval);
  }

  return null;
}

export default function Index() {
  const {
    loading,
    isAuthenticated,
    user
  } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function routeUser() {
      if (loading) {
        return;
      }

      if (!isAuthenticated) {
        if (!cancelled) {
          router.replace("/login");
        }

        return;
      }

      try {
        /*
         * Do not read user-scoped storage until the
         * authenticated namespace is available.
         */
        const namespaceUserId =
          await waitForUserNamespace();

        if (cancelled) {
          return;
        }

        console.log(
          "STARTUP AUTH USER:",
          user?.id || null
        );

        console.log(
          "STARTUP NAMESPACE USER ID:",
          namespaceUserId
        );

        if (!namespaceUserId) {
          throw new Error(
            "Authenticated user namespace was not restored."
          );
        }

        /*
         * Protect against reading another user's or guest
         * namespace during startup.
         */
        if (
          user?.id &&
          namespaceUserId !== user.id
        ) {
          throw new Error(
            `Namespace mismatch: expected ${user.id}, received ${namespaceUserId}`
          );
        }

        const cloudProfileState =
          await restoreInvestorProfileFromCloud();

        const context =
          await loadInvestorContext();

        if (cancelled) {
          return;
        }

        console.log(
          "STARTUP INVESTOR CONTEXT:",
          JSON.stringify(
            {
              namespaceUserId,
              identity: context?.identity,
              journey: context?.journey,
              profileFirstName:
                context?.profile?.firstName,
              hasInvestorDNA:
                Boolean(context?.investorDNA),
              practiceStatus:
                context?.practicePortfolio?.status,
              practiceHoldings:
                context?.practicePortfolio
                  ?.holdings?.length || 0
            },
            null,
            2
          )
        );

        const profile =
          context?.profile || {};

        const investorDNA =
          context?.investorDNA || null;

        const practicePortfolio =
          context?.practicePortfolio || null;

        const hasCompletedProfile =
          cloudProfileState?.status === "FOUND" ||
          context?.profile?.onboardingCompleted === true;

        if (hasCompletedProfile) {
          router.replace("/(tabs)/dashboard");
          return;
        }

        /*
         * UNKNOWN is not evidence that the investor lacks a profile.
         * Keep authenticated returning users out of onboarding during a
         * temporary profile-service interruption.
         */
        if (cloudProfileState?.status === "UNKNOWN") {
          console.warn(
            "Investor profile verification deferred:",
            cloudProfileState?.error
          );
          router.replace("/(tabs)/dashboard");
          return;
        }

        let firstName =
  context?.identity?.firstName ||
  profile?.firstName ||
  null;

let lastName =
  context?.identity?.lastName ||
  profile?.lastName ||
  null;

/*
 * Migrate older completed investor records that were
 * created before GateCEP started collecting names.
 */
if (
  !firstName &&
  context?.journey?.hasInvestorDNA &&
  context?.journey?.hasPracticePortfolio &&
  user?.username
) {
  const username =
    String(user.username).trim();

  const nameParts =
    username.split(/\s+/);

  firstName =
    nameParts[0] || username;

  lastName =
    nameParts.slice(1).join(" ");

  await saveProfile({
    firstName,
    lastName,
    identityMigratedFromAuth: true
  });

  console.log(
    "LEGACY INVESTOR NAME MIGRATED:",
    {
      firstName,
      lastName
    }
  );
}

const hasName =
  Boolean(firstName);

if (!hasName && cloudProfileState?.status === "MISSING") {
  router.replace("/onboarding/name");
  return;
}

        const hasInvestorDNA =
          Boolean(
            context?.journey?.hasInvestorDNA
          ) ||
          Boolean(investorDNA);

        if (!hasInvestorDNA) {
          router.replace("/new-investor");
          return;
        }

        const hasPracticePortfolio =
          Boolean(
            context?.journey
              ?.hasPracticePortfolio
          ) ||
          Boolean(
            practicePortfolio?.holdings?.length
          ) ||
          practicePortfolio?.status ===
            "ACTIVE";

        if (!hasPracticePortfolio) {
          router.replace("/starter-plan");
          return;
        }

        router.replace("/(tabs)/dashboard");
      } catch (error) {
        console.error(
          "Unable to restore GateCEP investor journey:",
          error
        );

        /*
         * Do not send an authenticated user back through
         * onboarding because of a temporary restoration race.
         */
        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    routeUser();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    isAuthenticated,
    user?.id
  ]);

  return (
    <View style={styles.screen}>
      <ActivityIndicator
        size="large"
        color="#67e8f9"
      />

      <Text style={styles.message}>
        Preparing your GateCEP journey...
      </Text>
    </View>
  );
}

const styles = {
  screen: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center"
  },

  message: {
    color: "#94a3b8",
    marginTop: 12
  }
};
