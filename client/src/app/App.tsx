import { useEffect, useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { appRouter } from "./routers/appRouter";
import { syncLanguageWithServer } from "@/shared/config/i18n";

function App() {
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

  useEffect(() => {
    // Apply theme/color/font from a settings object
    const applySettings = (settings: {
      theme?: string;
      primary_color?: string;
      font_family?: string;
    }) => {
      // Theme
      const isDark =
        settings.theme === "dark" ||
        (!settings.theme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", isDark ? "#111827" : "#ffffff");
      }

      // Primary color
      if (settings.primary_color) {
        document.documentElement.style.setProperty(
          "--primary",
          settings.primary_color,
        );
        const hex = settings.primary_color.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        document.documentElement.style.setProperty(
          "--primary-foreground",
          brightness > 155 ? "#000000" : "#ffffff",
        );
      }

      // Font
      if (settings.font_family) {
        document.documentElement.style.setProperty(
          "--font-family",
          settings.font_family,
        );
      }

      // Sync to localStorage for fast init on next load
      if (settings.theme) localStorage.setItem("theme", settings.theme);
      if (settings.primary_color)
        localStorage.setItem("primary_color", settings.primary_color);
      if (settings.font_family)
        localStorage.setItem("font_family", settings.font_family);
    };

    // 1. Quick init from localStorage (prevents flash)
    applySettings({
      theme: localStorage.getItem("theme") || undefined,
      primary_color: localStorage.getItem("primary_color") || undefined,
      font_family: localStorage.getItem("font_family") || undefined,
    });

    // 2. Fetch from DB and override (handles cache-cleared scenario)
    syncLanguageWithServer();
    fetch("/api/settings/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) applySettings(data);
      })
      .catch(() => {});
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <RouterProvider router={appRouter} />
    </PersistQueryClientProvider>
  );
}

export default App;
