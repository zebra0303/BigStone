import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App.tsx";
import "./shared/config/i18n";
import "./app/styles/global.css";
import { registerSW } from "virtual:pwa-register";

// Register PWA service worker with periodic update checks
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // autoUpdate is on, so this normally wouldn't be called,
    // but having it here handles any edge cases
    if (confirm("New content available. Reload?")) {
      updateSW(true);
    }
  },
});

// Periodically check for updates (every 6 hours)
setInterval(
  () => {
    updateSW(true);
  },
  60 * 60 * 6 * 1000,
);

// Check for updates when window regained focus
window.addEventListener("focus", () => {
  updateSW(true);
});

// 새 서비스워커가 활성화(controllerchange)되면 자동으로 페이지를 새로고침하여 캐시 잔류 방지
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
