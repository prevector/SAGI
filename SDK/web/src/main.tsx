import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import WebsitePage from "./pages/WebsitePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WebsitePage />
  </StrictMode>
);
