import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg"],
      manifest: {
        name: "SAGI · Contribute",
        short_name: "SAGI",
        description: "Judge which model is better. Earn tokens. Built on the SAGI SDK.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#041414",
        theme_color: "#041414",
        // SVG-only for now (crisp at any size, no binary assets to track).
        // Drop PNG 192/512/maskable into public/icons and add them here for richer installs.
        icons: [
          { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        // Never cache the API — settlement polling must always hit the live mock.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
