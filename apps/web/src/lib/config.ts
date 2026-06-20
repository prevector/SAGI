// Brand text, feature flags, and the single mock/real swap point.

export const config = {
  brand: {
    name: "SAGI",
    tagline: "A distributed, open search for AGI"
  },
  // The token-economy ledger (apps/api) now serves the Api routes over real
  // SQL + SSE. Set VITE_USE_MOCK=1 to fall back to the pure-frontend mock.
  useMock: import.meta.env.VITE_USE_MOCK === "1",
  // Same-origin by default so the Vite proxy and /sagi sub-path mount both work.
  // Override with VITE_API_URL only when pointing at a separate engine host.
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "",
  features: {
    realtimeNetwork: true,
    // Realtime leaderboard — initial fetch + live SSE stream of the top N.
    realtimeLeaderboard: true,
    sessions: true,
    // 3D session visual (creature evolving to solve a maze). Lazy-loaded, so
    // three.js only enters the bundle when this is on and the page is opened.
    session3dVisual: true,
    // Compute/train session visual (genome strings evolving). Canvas-2D, lazy-
    // loaded; the hero glyph-noise → highlight technique on a dedicated route.
    sessionTrainVisual: true,
    // Mini chain explorer on the network page (C3).
    ledgerExplorer: true
  },
  // Top-bar compute HUD (CPU/GPU specs + fabricated realtime %). Behind a
  // swappable ComputeMetricsSource seam — only `mock` is implemented; the
  // browser/agent tiers (real %) are deferred. See
  // SAGI-compute-metrics-feasibility.md.
  computeMetrics: {
    source: "mock" as "mock" | "browser" | "agent"
  }
} as const;
