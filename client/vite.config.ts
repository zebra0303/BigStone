import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the root directory
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");
  console.log(`[Vite Config] Loaded env from: ${path.resolve(__dirname, "../")}`);
  console.log(`[Vite Config] PORT: ${env.PORT}, VITE_PORT: ${env.VITE_PORT}`);

  const serverPort = parseInt(env.PORT || "3001", 10);
  const clientPort = parseInt(env.VITE_PORT || "5173", 10);

  return {
    envDir: "../",
    plugins: [react()],
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
