import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import GamePage from "./pages/GamePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GamePage />
  </StrictMode>
);
