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

      const currentUser =
        await getCurrentUser(token);

      const resolvedUser =
        currentUser ||
        storedUser;

      if (!resolvedUser) {
        throw new Error(
          "Authenticated user could not be restored."
        );
      }

      /*
       * Restore the canonical API authentication session.
       */
      setAccessToken(token);
      setUser(resolvedUser);

      /*
       * CRITICAL:
       * Restore the legacy/user-storage namespace.
       *
       * userGetItem() and userSetItem() depend on
       * gatecepSession -> userId.
       */
      await saveSession(resolvedUser);

      /*
       * Now user-scoped storage reads the correct
       * investor namespace.
       */
      await restorePortfolioFromCloud();
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

    if (
      previousUserId &&
      previousUserId !== result.user.id
    ) {
      await clearUserScopedCaches();
    }

    /*
     * Save API authentication.
     */
    await saveAuthSession({
      accessToken: result.accessToken,
      user: result.user
    });

    /*
     * CRITICAL:
     * Save the user namespace used by userStorage.
     *
     * This restores:
     * gatecepSession
     * gatecepCurrentUserId
     * gatecepIsLoggedIn
     */
    await saveSession(result.user);

    setAccessToken(
      result.accessToken
    );

    setUser(
      result.user
    );

    /*
     * Must happen after saveSession().
     */
    await restorePortfolioFromCloud();

    return result;
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