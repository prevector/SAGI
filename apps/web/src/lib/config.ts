// Brand text, feature flags, and the single mock/real swap point.

export const config = {
  brand: {
    name: "SAGI",
    tagline: "A distributed, open search for AGI"
  },
  // Flip to false once the engine implements httpApi. No component changes.
  useMock: true,
  // Same-origin by default so the Vite proxy and /sagi sub-path mount both work.
  // Override with VITE_API_URL only when pointing at a separate engine host.
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "",
  features: {
    realtimeNetwork: true,
    sessions: true
  }
} as const;
