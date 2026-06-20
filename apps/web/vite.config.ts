import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/health": "http://localhost:4000"
    }
  }
});
