import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the root directory
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");

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
    server: {
      host: true,
      port: clientPort,
      proxy: {
        "/api": {
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
    },
  };
});
