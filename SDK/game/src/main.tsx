import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import ContributePage from "./pages/ContributePage";

// Dev-only self-heal: this app is a PWA, so a service worker from a prior
// `vite preview` of dist/ can linger and replay a stale build inside the demo's
// phone iframe. In dev we never want that — unregister any and reload once.
// Production keeps its service worker so the app stays installable.
if (import.meta.env.DEV && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    Promise.all(regs.map((r) => r.unregister()))
      .then(() => ("caches" in window ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))) : null))
      .then(() => window.location.reload());
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContributePage />
  </StrictMode>
);
