import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AUTH_UNAUTHORIZED_EVENT, tryRefreshToken } from "@/shared/lib/errors";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => localStorage.getItem("is_admin_logged_in") === "true",
  );

  useEffect(() => {
    // Listen for 401 unauthorized events or cross-tab storage changes
    const handleUnauthorized = () => {
      setIsAuthenticated(localStorage.getItem("is_admin_logged_in") === "true");
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    window.addEventListener("storage", handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
      window.removeEventListener("storage", handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Verify and extend session on initial protected route load and when returning to the tab
    void tryRefreshToken(true);

    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        void tryRefreshToken(true);
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
