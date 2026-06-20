
# SAGI SDK Demo

A self-contained demo of the SAGI signal-path architecture: mock network + SDK client + 3D swarm dashboard.

## Structure

```
SDK/
├── mock-network/          # Express server (port 8000)
│   └── src/
│       ├── server.ts      # HTTP server
│       ├── routes/sagi.ts # API endpoints (incl. GET /signal/:betId settlement)
│       └── mock/sagiMock.ts # in-memory state + settlement
├── web/                   # 3D swarm dashboard — external view (port 5173)
│   └── src/
│       ├── sdk/index.ts   # SDK client (the seam)
│       └── pages/SwarmPage.tsx # 3D dashboard
├── game/                  # Battle Arena PWA — player view (port 5174)
│   └── src/
│       ├── sdk/index.ts   # SDK client (the seam, + getSignalResult)
│       ├── pages/GamePage.tsx
│       └── game/          # session state machine + 3D arena + combatants
└── package.json           # runs all three services in parallel
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
- Swarm dashboard: `http://localhost:5173`
- Battle Arena game: `http://localhost:5174`

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

## Battle Arena game (`game/`)

A mobile-first PWA on top of the SDK. Two creatures face off; the player **bets which
one wins** before it resolves. That bet **is** the SDK signal (`submitSignal`), and the
fight winner **is** the settlement result (the higher hidden `trueScore`).

- **Loop** (endless, Candy-Crush style): `requestTask` → bet A/B (`submitSignal`) →
  a fight animation plays while the bet settles in the background (`getSignalResult`
  polled every 600ms) → reveal winner + tokens → next round. Win-streak + running pot,
  best streak persisted in `localStorage`.
- **Async settlement is masked by the fight.** Settlement takes 3–5s; the FIGHTING
  phase runs a symmetric lunge loop (reveals nothing) with a min-anim floor (~3s) and
  a safety cap (~12s), then resolves deterministically once the winner is known.
- **Effect on the swarm:** winning bets increment `tokens_awarded`, which the swarm
  dashboard already polls and pulses on — so playing the game on a phone makes the
  dashboard (the big screen) tick and flash. **No new nodes** are added; nodes
  represent connected devices.
- **Install:** `npm run build && npm run preview` in `game/`, then iOS Safari →
  Share → "Add to Home Screen" launches it standalone (dark, no browser chrome).

### Creature drop-in

Combatants are **placeholders** (`game/src/game/Combatant.tsx`) — a teammate is
building the real creature renderer. The mapping lives in one adapter,
`game/src/game/combatantFromCandidate.ts`. When the real `<Creature>` is ready, swap
`Combatant` for it and feed it the same candidate params; the game loop and the arena
choreography (`game/src/game/ArenaScene.tsx`) don't change.