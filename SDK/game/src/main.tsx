import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import ContributePage from "./pages/ContributePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContributePage />
  </StrictMode>
);
