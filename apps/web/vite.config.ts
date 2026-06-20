import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `base` lets the app be hosted under a sub-path (e.g. /sagi). It feeds both
// Vite's asset URLs and the router basename via import.meta.env.BASE_URL.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/health": "http://localhost:4000"
    }
  }
});
