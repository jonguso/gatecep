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
  loadAdminOverview
} from "../src/features/admin/api/adminApi";

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

import {
  hydrateAuthenticatedInvestorTransactionHistory
} from "../src/features/transactions/canonicalInvestorTransactionHistoryHydrationService";


function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function hydrateInvestorHistoryBeforeDashboard() {
  try {
    const result =
      await hydrateAuthenticatedInvestorTransactionHistory();

    console.log(
      "STARTUP CANONICAL TRANSACTION HISTORY HYDRATION:",
      {
        ok: result?.ok === true,
        brokerLinkCount:
          Number(result?.brokerLinkCount || 0),
        hydratedCount:
          Number(result?.hydratedCount || 0),
        unavailableCount:
          Number(result?.unavailableCount || 0),
        failedCount:
          Number(result?.failedCount || 0)
      }
    );

    return result;
  } catch (error) {
    /*
     * Canonical transaction history is server authority,
     * while the investor's local history is a derived cache.
     *
     * A temporary hydration/network failure must not turn
     * authenticated investor startup into a login failure.
     * R44I/R44E also do not clear local history when canonical
     * authority is unavailable.
     */
    console.warn(
      "Canonical transaction history hydration deferred:",
      error
    );

    return {
      ok: false,
      deferred: true,
      error:
        error instanceof Error
          ? error.message
          : String(error || "Unknown hydration error")
    };
  }
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
    user,
    accessToken
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

      /*
       * ADMIN-NAV-001B
       *
       * Administrative landing is determined only by
       * the protected server Admin overview.
       *
       * Local/cached role data is never authoritative.
       */
      if (accessToken) {
        try {
          const adminOverview =
            await loadAdminOverview(accessToken);

          const serverVerifiedAdmin =
            adminOverview?.admin === true &&
            String(
              adminOverview?.user?.role || ""
            )
              .trim()
              .toUpperCase() === "ADMIN";

          if (serverVerifiedAdmin) {
            if (!cancelled) {
              router.replace("/admin");
            }

            return;
          }
        } catch (adminAccessError) {
          /*
           * 401 means the authenticated server session
           * is no longer valid.
           *
           * 403 is an authenticated non-Admin account
           * and therefore continues through the normal
           * investor restoration flow.
           *
           * Network/5xx failures never promote a user
           * from local or cached role information.
           */
          if (adminAccessError?.status === 401) {
            if (!cancelled) {
              router.replace("/login");
            }

            return;
          }
        }
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
          await hydrateInvestorHistoryBeforeDashboard();

          if (cancelled) {
            return;
          }

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
          await hydrateInvestorHistoryBeforeDashboard();

          if (cancelled) {
            return;
          }

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

        await hydrateInvestorHistoryBeforeDashboard();

          if (cancelled) {
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
    user?.id,
    accessToken
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

// PC-030M20AV3AQ — Final Responsive UAT Closure: startup loading route verified responsive; no UI logic changed
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
