import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { startInstallWatch } from "./lib/pwa";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);

// Pick up a new version as soon as it's live: the page reloads onto it, so a
// screen never keeps running old code (saved data is kept on the device).
// Phones mostly resume an open tab or the installed app rather than reload it,
// so check whenever the app comes back into view, and hourly for the kitchen
// screens that stay open for days.
startInstallWatch();
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => void reg.update().catch(() => {});
    window.setInterval(check, 60 * 60_000);
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && check());
    window.addEventListener("online", check);
  },
});
