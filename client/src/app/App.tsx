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
    syncLanguageWithServer();

    // Initialize theme
    const savedTheme = localStorage.getItem("theme");
    if (
      savedTheme === "dark" ||
      (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Initialize custom colors
    const primaryColor = localStorage.getItem("primary_color");
    if (primaryColor) {
      document.documentElement.style.setProperty("--primary", primaryColor);

      // Basic brightness check to set foreground color
      const hex = primaryColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const foreground = brightness > 155 ? "#000000" : "#ffffff";
      document.documentElement.style.setProperty(
        "--primary-foreground",
        foreground,
      );
    }

    // Initialize font
    const savedFont = localStorage.getItem("font_family");
    if (savedFont) {
      document.documentElement.style.setProperty("--font-family", savedFont);
    }
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
