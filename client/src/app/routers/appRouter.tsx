/* eslint-disable react-refresh/only-export-components */
import React, { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { PageLoader } from "@/shared/ui/PageLoader";

// Dynamically import pages for code splitting
const HomePage = React.lazy(() =>
  import("@/pages/home").then((module) => ({ default: module.HomePage })),
);
const SearchPage = React.lazy(() =>
  import("@/pages/search").then((module) => ({ default: module.SearchPage })),
);
const AdminPage = React.lazy(() =>
  import("@/pages/admin").then((module) => ({ default: module.AdminPage })),
);
const RetrospectivePage = React.lazy(() =>
  import("@/pages/retrospective").then((module) => ({
    default: module.RetrospectivePage,
  })),
);

// Wrapper component to apply Suspense to all routes
const SuspendedRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
);

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <SuspendedRoute>
          <HomePage />
        </SuspendedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/search",
    element: (
      <ProtectedRoute>
        <SuspendedRoute>
          <SearchPage />
        </SuspendedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/retrospective",
    element: (
      <ProtectedRoute>
        <SuspendedRoute>
          <RetrospectivePage />
        </SuspendedRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/admin",
    element: (
      <SuspendedRoute>
        <AdminPage />
      </SuspendedRoute>
    ),
  },
]);
