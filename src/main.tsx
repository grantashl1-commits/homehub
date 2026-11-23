import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
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
// Also checks hourly, because kitchen screens stay open for days.
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) window.setInterval(() => void reg.update(), 60 * 60_000);
  },
});
