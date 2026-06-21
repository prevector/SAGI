import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import WebsitePage from "./pages/WebsitePage";
import DemoPage from "./pages/DemoPage";

// Self-heal: this app never registers a service worker. If a stale one from
// another app previously served on this origin (e.g. localhost:5173) is still
// controlling the page, it replays the wrong bundle — a 404. Unregister any,
// drop its caches, and reload once so the demo always renders. (No-op when
// clean, so no reload loop.)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length === 0) return;
    Promise.all(regs.map((r) => r.unregister()))
      .then(() => ("caches" in window ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))) : null))
      .then(() => window.location.reload());
  });
}

// Tiny path switch — no router needed. "/demo" is the pitch composition (phone +
// live swarm); everything else is the marketing site.
const path = window.location.pathname.replace(/\/$/, "");
const Page = path === "/demo" ? DemoPage : WebsitePage;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>
);
