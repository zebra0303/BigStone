import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the root directory
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");
  console.log(
    `[Vite Config] Loaded env from: ${path.resolve(__dirname, "../")}`,
  );
  console.log(`[Vite Config] PORT: ${env.PORT}, VITE_PORT: ${env.VITE_PORT}`);

  const serverPort = parseInt(env.PORT || "3001", 10);
  const clientPort = parseInt(env.VITE_PORT || "5173", 10);

  return {
    envDir: "../",
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: true,
        },
        includeAssets: ["favicon.ico", "bigxi.png"],
        manifest: {
          name: "BigStone Task Manager",
          short_name: "BigStone",
          description: "Focus on what matters - BigStone Task Manager",
          theme_color: "#3b82f6",
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          icons: [
            {
              src: "pwa-icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{ico,png,svg,webp,jpg,jpeg,gif,woff,woff2,ttf,eot}"],
          navigateFallback: "/index.html",
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Exclude auth endpoints from caching entirely
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/api/settings/login") ||
                url.pathname.startsWith("/api/settings/setup") ||
                url.pathname.startsWith("/api/settings/refresh"),
              handler: "NetworkOnly",
            },
            {
              // Cache GET API requests only, with network-first strategy
              urlPattern: ({ url, request }) =>
                url.pathname.startsWith("/api") && request.method === "GET",
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24,
                },
                networkTimeoutSeconds: 5,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom", "zustand"],
            query: ["@tanstack/react-query"],
            ui: ["lucide-react"],
            i18n: [
              "i18next",
              "react-i18next",
              "i18next-browser-languagedetector",
            ],
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
    server: {
      host: true,
      port: clientPort,
      proxy: {
        "/api": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: true,
      port: clientPort,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
