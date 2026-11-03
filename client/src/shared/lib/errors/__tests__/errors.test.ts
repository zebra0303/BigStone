import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ApiError,
  handleApiError,
  clearAuthSession,
  tryRefreshToken,
  AUTH_UNAUTHORIZED_EVENT,
} from "../index";

describe("Auth session and API 401 error handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("clears auth state and dispatches unauthorized event on 401 response in handleApiError", async () => {
    localStorage.setItem("is_admin_logged_in", "true");
    localStorage.setItem("admin_token_refreshed_at", "123456");

    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    const response = new Response(
      JSON.stringify({ error: "Invalid or expired token" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );

    await expect(
      handleApiError(response, "Failed to update todo"),
    ).rejects.toThrow(ApiError);

    expect(localStorage.getItem("is_admin_logged_in")).toBeNull();
    expect(localStorage.getItem("admin_token_refreshed_at")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });

  it("preserves auth state on non-401 error responses in handleApiError", async () => {
    localStorage.setItem("is_admin_logged_in", "true");
    localStorage.setItem("admin_token_refreshed_at", "123456");

    const response = new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );

    await expect(
      handleApiError(response, "Failed to update todo"),
    ).rejects.toThrow("Internal server error");

    expect(localStorage.getItem("is_admin_logged_in")).toBe("true");
    expect(localStorage.getItem("admin_token_refreshed_at")).toBe("123456");
  });

  it("tryRefreshToken clears auth session when server returns 401", async () => {
    localStorage.setItem("is_admin_logged_in", "true");
    localStorage.setItem("admin_token_refreshed_at", "0");

    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
      }),
    );

    await tryRefreshToken();

    expect(localStorage.getItem("is_admin_logged_in")).toBeNull();
    expect(localStorage.getItem("admin_token_refreshed_at")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });

  it("tryRefreshToken updates admin_token_refreshed_at when server returns 200", async () => {
    localStorage.setItem("is_admin_logged_in", "true");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Token refreshed" }), {
        status: 200,
      }),
    );

    await tryRefreshToken(true);

    const refreshedAt = Number(
      localStorage.getItem("admin_token_refreshed_at"),
    );
    expect(refreshedAt).toBeGreaterThan(0);
  });

  it("clearAuthSession removes auth keys and dispatches unauthorized event", () => {
    localStorage.setItem("is_admin_logged_in", "true");
    localStorage.setItem("admin_token_refreshed_at", "999");

    const listener = vi.fn();
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);

    clearAuthSession();

    expect(localStorage.getItem("is_admin_logged_in")).toBeNull();
    expect(localStorage.getItem("admin_token_refreshed_at")).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  });
});
