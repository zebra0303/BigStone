import { ApiClient } from "@zebra/core/client";
import { clearAuthSession } from "@/shared/lib/errors";

// Shared ApiClient instance configured with HttpOnly cookies and 401 session cleanup
export const apiClient = new ApiClient({
  baseUrl: "/api",
  credentials: "include",
  onUnauthorized: () => {
    clearAuthSession();
  },
});
