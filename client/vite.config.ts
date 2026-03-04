import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
<<<<<<< HEAD
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");
  const targetPort = env.PORT || "3001";
=======
  // Load env file from the root directory
  const env = loadEnv(mode, path.resolve(__dirname, "../"), "");

  const serverPort = parseInt(env.PORT || "3001", 10);
  const clientPort = parseInt(env.VITE_PORT || "5173", 10);
>>>>>>> 34cd0d49f49cbc045d9c0c27ec7dd119797b51e0

  return {
    envDir: "../",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
<<<<<<< HEAD
      proxy: {
        "/api": {
          target: `http://localhost:${targetPort}`,
=======
      host: true,
      port: clientPort,
      proxy: {
        "/api": {
          target: `http://localhost:${serverPort}`,
>>>>>>> 34cd0d49f49cbc045d9c0c27ec7dd119797b51e0
          changeOrigin: true,
          secure: false,
        },
      },
    },
<<<<<<< HEAD
=======
    preview: {
      host: true,
      port: clientPort,
      allowedHosts: true,
    },
>>>>>>> 34cd0d49f49cbc045d9c0c27ec7dd119797b51e0
  };
});
