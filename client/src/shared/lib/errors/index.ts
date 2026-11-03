// Re-export error utilities from shared library with 401 session synchronization
import {
  ApiError,
  handleApiError as baseHandleApiError,
  getErrorMessage,
} from "@zebra/core";

export { ApiError, getErrorMessage };

export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";
const TOKEN_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 1 day

/**
 * Clears stale client-side auth flags and notifies mounted route guards/pages
 * when the server rejects an expired or missing HttpOnly JWT cookie.
 */
export function clearAuthSession(): void {
  localStorage.removeItem("is_admin_logged_in");
  localStorage.removeItem("admin_token_refreshed_at");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  }
}

/**
 * Wraps @zebra/core handleApiError to clear stale auth state on 401 responses
 * so users are redirected to login instead of experiencing silent update failures.
 */
export async function handleApiError(
  response: Response,
  defaultMessage = "API request failed",
): Promise<never> {
  if (response.status === 401) {
    clearAuthSession();
  }
  return baseHandleApiError(response, defaultMessage);
}

/**
 * Verifies and refreshes the admin JWT cookie.
 * If the server returns 401 (expired/missing cookie), clears local auth state immediately.
 */
export async function tryRefreshToken(force = false): Promise<void> {
  if (localStorage.getItem("is_admin_logged_in") !== "true") return;

  const lastRefresh = parseInt(
    localStorage.getItem("admin_token_refreshed_at") || "0",
    10,
  );
  if (!force && Date.now() - lastRefresh < TOKEN_REFRESH_INTERVAL) return;

  try {
    const res = await fetch("/api/settings/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      localStorage.setItem("admin_token_refreshed_at", String(Date.now()));
    } else if (res.status === 401) {
      clearAuthSession();
    }
  } catch {
    // Ignore transient network failures so offline PWA viewing remains intact
  }
}
