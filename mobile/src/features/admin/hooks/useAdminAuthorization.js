import {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  useAuth
} from "../../auth/hooks/useAuth";

import {
  loadAdminOverview
} from "../api/adminApi";

/*
 * ============================================================
 * ADMIN-004B4
 * SHARED SERVER-AUTHORITATIVE ADMIN AUTHORIZATION
 * ============================================================
 *
 * Authentication alone is not sufficient for privileged
 * GateCEP operational workspaces.
 *
 * This hook verifies the current session against the backend
 * Admin boundary through loadAdminOverview().
 *
 * Client-side role state is never treated as authoritative.
 * ============================================================
 */

export function useAdminAuthorization() {
  const {
    accessToken,
    user,
    loading: authLoading
  } = useAuth();

  const [checking, setChecking] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  const [error, setError] =
    useState("");

  const verifyAdminAccess =
    useCallback(async () => {
      if (!accessToken) {
        setAuthorized(false);

        setError(
          "Administrator authentication is required."
        );

        setChecking(false);

        return false;
      }

      setChecking(true);
      setError("");

      try {
        const result =
          await loadAdminOverview(
            accessToken
          );

        const verified =
          result?.admin === true &&
          String(
            result?.user?.role || ""
          )
            .trim()
            .toUpperCase() ===
            "ADMIN";

        setAuthorized(verified);

        if (!verified) {
          setError(
            "This workspace requires GateCEP administrator authorization."
          );
        }

        return verified;
      } catch (accessError) {
        setAuthorized(false);

        if (accessError?.status === 401) {
          setError(
            "Your authenticated session is no longer valid."
          );
        } else if (
          accessError?.status === 403
        ) {
          setError(
            "This account is not authorized for GateCEP operations."
          );
        } else {
          setError(
            accessError?.message ||
            "Administrator authorization could not be verified."
          );
        }

        return false;
      } finally {
        setChecking(false);
      }
    }, [accessToken]);

  useEffect(() => {
    if (!authLoading) {
      verifyAdminAccess();
    }
  }, [
    authLoading,
    verifyAdminAccess
  ]);

  return {
    accessToken,
    user,
    authLoading,
    checking,
    authorized,
    error,
    verifyAdminAccess
  };
}

export default useAdminAuthorization;
