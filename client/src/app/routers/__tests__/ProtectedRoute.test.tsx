import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProtectedRoute } from "../ProtectedRoute";
import { clearAuthSession } from "@/shared/lib/errors";

describe("ProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Token refreshed" }), {
        status: 200,
      }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("redirects to /admin when not authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Home Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<div>Admin Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Admin Login")).toBeInTheDocument();
  });

  it("redirects to /admin when auth session is cleared on 401 while mounted", () => {
    localStorage.setItem("is_admin_logged_in", "true");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div>Home Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<div>Admin Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Home Content")).toBeInTheDocument();

    // Simulate a 401 unauthorized response clearing the auth session
    act(() => {
      clearAuthSession();
    });

    expect(screen.getByText("Admin Login")).toBeInTheDocument();
  });
});
