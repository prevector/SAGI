import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import SwarmPage from "./pages/SwarmPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SwarmPage />
  </StrictMode>
);
