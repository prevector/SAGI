# SAGI mock — hackathon build plan (for Claude Code)

**Goal:** build a working, demoable mock of the SAGI creature-duel app + a mock network standing in for the SDK's **signal path**. Deliver by Sunday evening.

**North-star reference (already in repo):** `sagi-sdk-unified-spec.md`. That is the *production* design. **This plan builds a deliberately simplified subset of it.** When the spec and this plan disagree, this plan wins for the hackathon.

---

## Scope

**Build (the signal path only):**
- A mock network service that hands out duels, accepts picks, settles them fast against a hidden ground-truth score, and pays token rewards.
- A mobile-first web app: the creature duel, a deterministic creature renderer, and a big-screen dashboard.
- A thin TS SDK client in the app that wraps the mock network — this is the seam where the real SDK swaps in later.

**Stub or skip (do NOT build these — they're in the spec but out of scope for the mock):**
- Cryptographic node identity / signing → use a plain `user_id`. No keys, no signatures.
- Restricted genome runtime / the compute path → at most a cosmetic "contributing…" toggle. No real execution.
- Validation by independent reproduction / multi-node agreement → the mock settles instantly against its own ground truth.
- Wallet internals (`transfer_tokens`, `verify_reward`) → a balance number that goes up, plus a reward feed.
- Real Side A integration → out of scope here; keep the swap seam (see SDK client) so it's a one-file change later.

---

## Architecture

Two services, run together with docker-compose. The app codes against an SDK-shaped client, never against raw HTTP.

```
web/ (React + Vite + TypeScript, mobile-first)
  src/sdk/index.ts        # SDK signal surface, wraps HTTP. Real SDK swaps in HERE.
  src/creature/render.tsx # params -> deterministic SVG creature
  src/screens/Duel.tsx    # core loop
  src/screens/Dashboard.tsx # big-screen mission control
  src/api... 
mock-network/ (FastAPI)   # stands in for SAGI: candidates, duels, signals, settlement, wallet, leaderboard, feed
docker-compose.yml
README.md
```

State in the mock can be in-memory, seeded at startup (no DB needed for a weekend; add SQLite only if persistence across restarts is wanted). Live updates via polling (1–2s) — no websockets needed.

---

## The SDK client (the seam)

`src/sdk/index.ts` exposes the spec's signal surface, simplified. The app only ever calls these:

```ts
registerUser(deviceId): { user_id }
requestTask(userId): SignalTask          // a DUEL
submitSignal(taskId, userId, picked)     // "a" | "b"
getLeaderboard(limit): Candidate[]
getWallet(userId): Wallet
pollFeed(userId, since): RewardEvent[]    // drives on_task_settled animations
```

These map 1:1 onto the mock network endpoints below. Swapping in the real SDK later means reimplementing this one module; nothing else in the app changes.

---

## Mock network API

Plain JSON, no auth, no signatures.

```
POST /users            { device_id }                 -> { user_id }
GET  /tasks/next?user_id=                            -> { task_id, type:"DUEL", a:{id,params}, b:{id,params} }
POST /signal           { task_id, user_id, picked }  -> { ok:true, bet_id }     # picked: "a"|"b"
GET  /leaderboard?limit=                             -> [ { id, params, score, rank } ]
GET  /users/{id}/wallet                              -> { tokens, scouts, correct, rank }
GET  /users/{id}/feed?since=                         -> [ { type:"reward", candidate_id, tokens, ts } ]
GET  /stats                                          -> { players, votes, tokens_awarded }   # dashboard
```

`params` (the genome the renderer turns into a creature):
```
{ "layers": int, "width": int, "connections": float, "efficiency": float, "seed": str }
```

### Mock behaviour
- **On startup:** generate ~50 candidates with random `params` and a hidden `true_score` in [0,1] (a blend of `efficiency` plus noise is fine). The hidden score is the ground truth used to settle bets; it is never sent to the client.
- **`/tasks/next`:** return two candidates. For the mock, pick two whose `true_score` are *close* (so duels feel uncertain), or just two at random.
- **`/signal`:** record an open bet `(user, a, b, picked)`. **Settle it 3–5 seconds later** (background task or delayed resolve): the candidate with the higher `true_score` wins; if the user picked the winner, credit `signal_reward` tokens (scale by how close the duel was — closer = harder = more), increment `scouts` and `correct`, and push a reward event to the user's feed. Fast settlement is the property that makes the demo loop satisfying — do not skip it.
- **`/leaderboard`:** candidates ranked by `true_score` (add small noise so the board shifts and feels alive). `score` may reveal the rounded `true_score`.
- **`/stats`:** running totals for the dashboard.

---

## Creature renderer

A **pure, deterministic** function: same `params` → same creature. SVG, mobile-crisp. Seed all randomness from `params.seed`. Suggested mapping (refine freely, keep it legible):
- `layers` → number of body segments / limbs
- `width` → overall size / mass
- `connections` (0–1) → number of spikes or filaments
- `efficiency` (0–1) → colour (dull→bright) + subtle glow

The player's own avatar evolves through 3–4 visible stages as their wallet `tokens`/`correct` rise — presentational only.

**Design direction:** match the existing SAGI pitch assets so the app and deck feel like one product — deep indigo background (not black), violet `#8B7CF7` and warm amber `#F4A93C` as the two accents, Space Grotesk for display. Spend the visual budget on the creatures and the live dashboard; keep everything else quiet. Mobile-first, responsive, visible focus, reduced-motion respected.

---

## Screens

1. **Start** — tap to begin → `registerUser` → show the player's avatar creature.
2. **Duel (core loop)** — two creatures, "which is fitter?". On tap → `submitSignal` → brief "scouting…" → next duel. Header shows token balance + creature stage (from `getWallet`).
3. **Reward** — poll `pollFeed`; when a bet settles, animate tokens landing and the avatar growing.
4. **Dashboard (`/dashboard`)** — big-screen view: live candidate leaderboard (creatures ranked by score), a ticking feed of votes, totals from `/stats`, a light swarm animation. This is the demo money-shot.

---

## Milestones (build in order; satisfy each DoD before moving on)

- **M0 — Scaffold.** Repo, `docker-compose up` runs both services, mock-network returns a static duel + leaderboard, web shell loads, `src/sdk/index.ts` stubbed.
  *DoD:* `GET /tasks/next` returns two candidates; the app renders.

- **M1 — Core loop.** SDK client wired; Duel screen; deterministic creature renderer; pick → `submitSignal` → next duel.
  *DoD:* a player completes duels end to end and sees two distinct creatures each round.

- **M2 — Economy.** Mock settlement (3–5s); wallet polling; feed; reward + creature-growth animation.
  *DoD:* within seconds of a pick, a settled reward animates tokens and the avatar visibly grows.

- **M3 — Dashboard + polish.** Mission-control route live-updating from `/leaderboard` + `/stats`; mobile pass; design pass.
  *DoD:* full loop + dashboard look good; a clean 3-minute run-through works twice in a row.

For the demo, seed a handful of background votes so the dashboard looks busy with few real players.

---

## Working agreement for Claude Code

- Build milestone by milestone; meet each DoD before the next.
- The app talks to the network **only** through `src/sdk/index.ts`. Never call HTTP directly from screens.
- Stay in scope: no crypto, no runtime, no reproduction-validation, no DB unless a screen needs it. Re-read the Scope section before adding anything.
- The creature renderer is the one piece worth real care — keep it pure and well-isolated.
- Keep it runnable end to end at every commit; this mock is the whole demo.

### Env / run
```
VITE_SAGI_BASE_URL=http://localhost:8000   # mock-network
docker-compose up                          # web on :5173, mock-network on :8000
```
```
