import { useEffect, useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { ErrorBoundary, ToastContainer } from "@zebra/core/client";
import { appRouter } from "./routers/appRouter";
import i18n from "@/shared/config/i18n";
import { applyThemeSettings } from "@/shared/lib/theme";
import { AUTH_UNAUTHORIZED_EVENT } from "@/shared/lib/errors";
import { useToast } from "@/shared/ui";

function App() {
  // Mount ToastContainer once at the app root so any page/feature can dispatch toasts via useToast
  const { toasts, removeToast } = useToast();
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
    [],
  );

  const persister = useMemo(
    () =>
      createSyncStoragePersister({
        storage: window.localStorage,
      }),
    [],
  );

  // Clear in-memory TanStack Query cache whenever auth session is cleared or expires
  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.clear();
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [queryClient]);

  useEffect(() => {
    const controller = new AbortController();

    // 1. Quick init from localStorage (prevents FOUC)
    applyThemeSettings({
      theme: localStorage.getItem("theme") || undefined,
      primary_color: localStorage.getItem("primary_color") || undefined,
      font_family: localStorage.getItem("font_family") || undefined,
    });

    // 2. Single consolidated fetch for public UI config (language + theme + font)
    fetch("/api/settings/config", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.language) {
          void i18n.changeLanguage(data.language);
          document.documentElement.lang = data.language;
        }
        applyThemeSettings(data);
      })
      .catch(() => {
        /* ignore offline or aborted boot fetch */
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <RouterProvider router={appRouter} />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
