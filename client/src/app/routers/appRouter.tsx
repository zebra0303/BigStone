import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/home";
import { SearchPage } from "@/pages/search";
import { AdminPage } from "@/pages/admin";
import { ProtectedRoute } from "./ProtectedRoute";

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/search",
    element: (
      <ProtectedRoute>
        <SearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: <AdminPage />,
  },
]);
