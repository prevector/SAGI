# SAGI MVP

Minimal TypeScript monorepo for a hackathon MVP:

- `apps/web`: Vite-powered vanilla TypeScript dashboard
- `apps/api`: Express API
- `packages/shared`: shared types and mock dashboard data

The production build is intentionally simple:

- one Node server
- static frontend served by Express
- username-only auth in production
- automatic auth bypass in local development
- shared learning/runtime code in `packages/evolution`

## Commands

```bash
npm install
npm run dev
```

The web app runs on `http://localhost:5173` and proxies API requests to `http://localhost:4000`.
Local development runs in developer mode automatically, so auth is bypassed.

## Build

```bash
npm run build
```

Server-side verification is a single endpoint:

```bash
POST /api/verify
```

Body:

```json
{
  "seed": "demo-seed",
  "genome": [0, 0, 0]
}
```

It replays the submitted genome on the server with the shared `@sagi/evolution` code and returns `solved`, `fitness`, `steps`, and the traversed `path`.

Headless runs use:

```bash
POST /api/runs
GET /api/runs/:id
```

`POST /api/runs` accepts:

- `mode: "train"` to evolve one run headlessly on the server
- `mode: "replay"` to replay one submitted genome deterministically

Run records are stored as JSON files under `runs/` and include the config, genome, path, attempts, and summary stats. This is the simple storage layer for sending genomes between client and server and replaying them later.

## Local experiments

First paper-shaped smoke test:

```bash
npm run experiment:iaf
```

This runs a local TypeScript Evolution Strategies benchmark for a single GRU-like ENU on an integrate-and-fire target. It is a development-scale benchmark, not the full paper-scale reproduction.

## Python reference implementation

The full paper implementation we are using as the reference is already in this repo at:

- [implementation_paper](/Users/tim/Code/SAGI/implementation_paper)

That folder contains the original Python code for the ENU architecture and experiments from the paper. The TypeScript code in this repo is the new implementation path; the Python code is the reference baseline.

## Production

Create a `.env` file from `.env.example`:

```bash
PORT=4000
SESSION_SECRET=replace-this
SECURE_COOKIES=1
```

Then run:

```bash
npm ci
npm run build
npm run start
```

In production the frontend and API are both served from port `4000`.

## Release to a VPS

The simplest deploy path is:

1. Install Node 22+, Caddy, and systemd on the VPS.
2. Copy [deploy/sagi.service.example](/Users/tim/Code/SAGI/deploy/sagi.service.example:1) to `/etc/systemd/system/sagi.service` and adapt the user/path.
3. Put your `.env` file on the server at `/var/www/sagi/.env`.
4. Point Caddy at the app using [deploy/Caddyfile.example](/Users/tim/Code/SAGI/deploy/Caddyfile.example:1).
5. Deploy with:

```bash
./scripts/release.sh user@your-vps /var/www/sagi sagi
```

That script syncs the repo, runs `npm ci`, builds, and restarts the service.

## Authentication recommendation

For this MVP, the absolute simplest app-level auth is the one now wired in:

- local development: no auth
- production: enter any username
- session: signed HTTP-only cookie

This is identity-only, not real security. If you want actual protection with less app code, put the whole site behind Cloudflare Access or Tailscale and remove app auth entirely.

## Next docs

- Technical implementation brief: [TECHNICAL_README.md](/Users/tim/Code/SAGI/TECHNICAL_README.md:1)
- Visual direction: [VISUAL_STYLE.md](/Users/tim/Code/SAGI/VISUAL_STYLE.md:1)
- Shared algorithm runtime: [packages/evolution](/Users/tim/Code/SAGI/packages/evolution)
