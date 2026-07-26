import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getCurrentUser,
  loginUser,
  registerUser
} from "../api/authApi";

import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredUser,
  getStoredAuthUserId,
  saveAuthSession
} from "../storage/authStorage";

import {
  saveSession,
  logout as clearUserSession
} from "../../../auth/authStore";

import {
  restorePortfolioFromCloud
} from "../../portfolio/loadUserPortfolio";

const AuthContext = createContext(null);

const USER_SCOPED_CACHE_KEYS = [
  "gatecepPortfolio",
  "gatecepImportedPortfolioDraft",
  "gatecepStatementUploaded",
  "availableCash",
  "LatestUpload",
  "latestUpload",
  "importedPortfolioDraft",
  "ImportedPortfolioDraft",
  "PendingPortfolioImport",
  "pendingPortfolioImport"
];

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    restoreSession();
  }, []);

  async function clearUserScopedCaches() {
    await AsyncStorage.multiRemove(
      USER_SCOPED_CACHE_KEYS
    );
  }

  async function restoreSession() {
  try {
    const token =
      await getStoredAccessToken();

    const storedUser =
      await getStoredUser();

    if (!token) {
      setAccessToken(null);
      setUser(null);
      return;
    }

    /*
     * Begin with the locally stored authenticated user.
     *
     * A temporary failure from /auth/me must not destroy
     * an otherwise valid local session.
     */
    let resolvedUser = storedUser;

    try {
      const currentUser =
        await getCurrentUser(token);

      if (currentUser) {
        /*
         * Support APIs that return either:
         *
         * { id, email, username }
         *
         * or:
         *
         * { ok: true, user: {...} }
         */
        resolvedUser =
          currentUser?.user ||
          currentUser;
      }
    } catch (currentUserError) {
      console.warn(
        "Current-user refresh failed; using stored session:",
        currentUserError?.message ||
          currentUserError
      );
    }

    if (!resolvedUser) {
      throw new Error(
        "Authenticated user could not be restored."
      );
    }

    const canonicalUserId =
      resolvedUser?.id ||
      resolvedUser?.userId;

    if (!canonicalUserId) {
      throw new Error(
        "Restored authenticated user has no user ID."
      );
    }

    /*
     * Rewrite the canonical authentication record in case
     * the API returned fresher user information.
     */
    await saveAuthSession({
      accessToken: token,
      user: resolvedUser
    });

    /*
     * Restore the namespace before any user-scoped reads.
     */
    await saveSession(resolvedUser);

    setAccessToken(token);
    setUser(resolvedUser);

    /*
     * Portfolio restoration is useful, but it must not
     * invalidate authentication if the portfolio API fails.
     */
    try {
      await restorePortfolioFromCloud();
    } catch (portfolioError) {
      console.warn(
        "Portfolio restoration skipped:",
        portfolioError?.message ||
          portfolioError
      );
    }
  } catch (error) {
    console.error(
      "Unable to restore authentication session:",
      error
    );

    await clearAuthSession();
    await clearUserSession();
    await clearUserScopedCaches();

    setAccessToken(null);
    setUser(null);
  } finally {
    setLoading(false);
  }
}

 async function login(credentials) {
  const previousUserId =
    await getStoredAuthUserId();

  const result =
    await loginUser(credentials);

  /*
   * Support either login response structure:
   *
   * {
   *   accessToken,
   *   user
   * }
   *
   * or:
   *
   * {
   *   data: {
   *     accessToken,
   *     user
   *   }
   * }
   */
  const loginData =
    result?.data || result;

  const nextAccessToken =
    loginData?.accessToken ||
    loginData?.token;

  const nextUser =
    loginData?.user;

  if (!nextAccessToken) {
    throw new Error(
      "Login response did not include an access token."
    );
  }

  if (!nextUser) {
    throw new Error(
      "Login response did not include a user."
    );
  }

  const nextUserId =
    nextUser?.id ||
    nextUser?.userId;

  if (!nextUserId) {
    throw new Error(
      "Login response user did not include an ID."
    );
  }

  if (
    previousUserId &&
    previousUserId !== nextUserId
  ) {
    await clearUserScopedCaches();
  }

  await saveAuthSession({
    accessToken: nextAccessToken,
    user: nextUser
  });

  /*
   * Must happen before screens use userGetItem().
   */
  await saveSession(nextUser);

  setAccessToken(nextAccessToken);
  setUser(nextUser);

  try {
    await restorePortfolioFromCloud();
  } catch (portfolioError) {
    console.warn(
      "Portfolio restoration skipped after login:",
      portfolioError?.message ||
        portfolioError
    );
  }

  return {
    ...loginData,
    accessToken: nextAccessToken,
    user: nextUser
  };
}

  async function register(payload) {
    return await registerUser(payload);
  }

  async function logout() {
    /*
     * Clear both authentication systems.
     */
    await clearAuthSession();
    await clearUserSession();

    await clearUserScopedCaches();

    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        loading,
        accessToken,
        user,
        isAuthenticated:
          Boolean(accessToken && user),
        login,
        register,
        logout,
        restoreSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value =
    useContext(AuthContext);

  if (!value) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return value;
}