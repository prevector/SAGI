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
        background_color: "#F5F0EA",
        theme_color: "#F5F0EA",
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
    strictPort: true, // never silently migrate — the demo iframe hardcodes :5174
    host: true, // bind 0.0.0.0 so a phone on the same WiFi can reach it
    // Accept the tunnel/LAN hostnames (Vite blocks unknown Host headers by default).
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.io"],
    proxy: {
      // proxy runs server-side (on the Mac), so it still talks to the local mock
      "/api": "http://localhost:8000",
    },
  },
});
