import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

function installDevWarningFilters() {
  if (!import.meta.env.DEV) {
    return;
  }

  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const [firstArg] = args;
    if (
      typeof firstArg === "string" &&
      firstArg.includes("THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.")
    ) {
      return;
    }

    originalWarn(...args);
  };
}

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root not found.");
}

installDevWarningFilters();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
