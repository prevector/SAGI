
# SAGI SDK Demo

A self-contained demo of the SAGI signal path: a mock network, the SDK seam, a
**website** that shows the network alive and pitches the SDK, and a standalone
**example app** built on that SDK.

The story it tells: SAGI is a distributed network where devices and apps contribute
compute and human judgment and earn tokens for it. Passive compute attracts a small
crowd — but the SDK lets *any developer* plug an app in so its users contribute too.
The website is the pitch + live dashboard; the contribute app is "here's a real thing
built with the SDK," and it feeds the same network the website is showing.

## Structure

```
SDK/
├── mock-network/          # Express server (port 8000) — shared by both frontends
│   └── src/
│       ├── server.ts
│       ├── routes/sagi.ts # API endpoints (incl. GET /signal/:betId settlement)
│       └── mock/sagiMock.ts # in-memory state + settlement
├── web/                   # SAGI website (port 5173)
│   └── src/
│       ├── sdk/index.ts          # SDK client (the seam)
│       ├── components/Swarm.tsx        # reusable 3D swarm canvas
│       ├── components/useNetworkStats.ts # shared live nodes/stats polling
│       ├── pages/WebsitePage.tsx       # hero + dashboard + SDK pitch + CTA
│       └── pages/SwarmPage.tsx         # optional fullscreen swarm view
├── game/                  # "Contribute" app — example built on the SDK (port 5174)
│   └── src/
│       ├── sdk/index.ts          # SDK client (the seam, + getSignalResult)
│       ├── pages/ContributePage.tsx
│       └── game/                 # evaluator state machine + model cards + placeholders
└── package.json           # runs all three services in parallel
```

## Getting started

From the `SDK/` folder:

```bash
npm run install:all   # root + both subprojects
npm run dev           # api + web + game in parallel
```

- Mock network: `http://localhost:8000/health`
- Website: `http://localhost:5173`
- Contribute app: `http://localhost:5174`

## The website (`web/`)

A single-scroll site for developers / investors:

- **Hero** — the 3D swarm as a living backdrop with a live **dashboard**: devices in
  the swarm, signals contributed, tokens awarded (polled from the mock network, pulses
  on each token event).
- **SDK pitch** — what SAGI is, the flywheel (more apps → more human signal → more
  tokens), and the entire integration shown as a code block ("one file, four calls").
- **CTA** — links to the contribute app (`VITE_CONTRIBUTE_URL`, default
  `http://localhost:5174`).

The swarm scene lives in `components/Swarm.tsx`; both the website and the optional
fullscreen `SwarmPage` reuse it. Node count represents connected devices — playing the
contribute app does **not** add nodes, it ticks the dashboard counters.

## The contribute app (`game/`)

A minimal example of something built on the SDK. The user is an **evaluator**, not a
gambler:

- `requestTask` returns two candidate models (each a parameter set the network tested).
- The user judges **which model is better** and taps it — that tap **is** the SDK signal
  (`submitSignal`).
- The network settles the signal against ground truth in 3–5s (`getSignalResult`
  polled every 600ms); a matching judgment credits tokens. Settlement is surfaced
  honestly as "settling your signal against the network…", then a result.

It depends only on its `src/sdk/index.ts` seam. Mobile-friendly and installable as a
PWA (iOS Safari → Share → "Add to Home Screen"); the service worker never caches
`/api` so settlement polling always hits the live network.

### Creature drop-in

The two models render as **placeholder** combatants (`game/src/game/Combatant.tsx`) —
a teammate is building the real creature renderer. The mapping lives in one adapter,
`game/src/game/combatantFromCandidate.ts`. When the real `<Creature>` lands, swap
`Combatant` for it and feed it the same candidate params; `ModelCard` and the page
don't change.

## SDK seam

`*/src/sdk/index.ts` is a thin fetch wrapper over the signal-path surface
(`registerUser`, `requestTask`, `submitSignal`, `getSignalResult`, `getWallet`,
`getStats`, `getNodes`). **All UI imports from here only** — swap to the real SDK by
reimplementing this one file.

## Design

Colors: teal `#17c4c4` + orange `#f0783d` on dark bg `#041414`.
Fonts: Geist (variable) + Geist Mono (variable).
