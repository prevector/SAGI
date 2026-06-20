
# SAGI SDK Demo

A self-contained demo of the SAGI signal-path architecture: mock network + SDK client + 3D swarm dashboard.

## Structure

```
SDK/
├── mock-network/          # Express server (port 8000)
│   └── src/
│       ├── server.ts      # HTTP server
│       ├── routes/sagi.ts # 8 API endpoints
│       └── mock/sagiMock.ts # in-memory state + settlement
├── web/                   # React + Vite frontend (port 5173)
│   └── src/
│       ├── sdk/index.ts   # SDK client (the seam)
│       └── pages/SwarmPage.tsx # 3D dashboard
└── package.json           # runs both services in parallel
```

## Getting started

From the `SDK/` folder:

```bash
# Install all dependencies (root + both subprojects)
npm run install:all

# Start both services in parallel
npm run dev
```

- Mock network: `http://localhost:8000/health`
- Web app + dashboard: `http://localhost:5173`

## What's inside

**Mock network** (`mock-network/`):
- 50 candidates with hidden true scores
- 66 nodes (25 passive, 40 active, 1 coordinator)
- Settlement via setTimeout (3–5s)
- Bot simulation keeps dashboard alive with zero real players
- 8 endpoints: users, tasks, signal, leaderboard, wallet, feed, stats, nodes

**SDK client** (`web/src/sdk/index.ts`):
- Thin fetch wrapper exposing the signal-path surface
- All UI code imports exclusively from here
- Swap to the real SDK by reimplementing this one file

**3D swarm dashboard** (`web/src/pages/SwarmPage.tsx`):
- Fullscreen Three.js canvas
- 66 glowing nodes drifting via simplex noise
- OrbitControls + Bloom post-processing
- Live stats HUD + pulse animation on token events
- Responsive, no auth required

## Design

Colors: teal `#17c4c4` + orange `#f0783d` on dark bg `#041414`.
Fonts: Geist (variable) + Geist Mono (variable).

## Next: The duel game

When you're ready to build the creature duel screens, they'll plug into the SDK client at `web/src/sdk/index.ts`. The existing creature system from the monorepo can be adapted for the duel side-by-side layout. 