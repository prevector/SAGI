import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail loudly on a port clash instead of silently migrating to 5174 — a
    // migrated port breaks the /demo URL and the phone iframe's hardcoded :5174.
    strictPort: true,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
