# DEPLOY.md — Putting SAGI live on sagi.network

How SAGI is served: **one Node process** (`apps/api`, port `4000`) serves both the
API (`/api/*`, `/health`) **and** the built website (`apps/web/dist`) with a
catch-all that returns `index.html` for any non-API path. So the same origin
serves `/` (landing page) and `/app/*` (dashboard). The public domain just needs
to reach that process over HTTPS — handled by **Caddy** reverse-proxying to
`127.0.0.1:4000`. There is **no separate static host**.

```
Browser ──HTTPS──> Caddy (:443, sagi.network) ──> Node API (:4000) ──> serves /api + web build
```

---

## Phase 0 — Prerequisites (one-time, skip if already done)

- [ ] A Linux server/VPS with a **public IP** and ports **80 + 443** open.
- [ ] Install **Node 20+** and **npm** on the server.
- [ ] Install **Caddy** (auto-HTTPS via Let's Encrypt).
- [ ] Create a deploy user and app dir: `sudo useradd -m deploy` and `sudo mkdir -p /var/www/sagi && sudo chown deploy:deploy /var/www/sagi`.
- [ ] Ensure your SSH key can reach the server as `deploy@<server-ip>`.

## Phase 1 — DNS (at your domain registrar)

- [ ] `A` record: `sagi.network` → `<server-ipv4>`
- [ ] `AAAA` record: `sagi.network` → `<server-ipv6>` *(only if the server has IPv6)*
- [ ] *(optional)* `A` record: `www.sagi.network` → `<server-ipv4>`
- [ ] Wait for DNS to propagate (`dig +short sagi.network` returns your IP).

## Phase 2 — Server config (one-time)

- [ ] **Caddyfile** — put this in `/etc/caddy/Caddyfile` (Caddy fetches the TLS cert automatically):
  ```caddy
  sagi.network {
    reverse_proxy 127.0.0.1:4000
  }

  # optional: redirect www → apex
  www.sagi.network {
    redir https://sagi.network{uri}
  }
  ```
  Then: `sudo systemctl reload caddy`
- [ ] **systemd service** — copy `deploy/sagi.service.example` to `/etc/systemd/system/sagi.service` (it runs `npm run start` in `/var/www/sagi` as user `deploy`, `NODE_ENV=production`).
- [ ] **Environment** — create `/var/www/sagi/.env` from `.env.example` with at least:
  ```env
  PORT=4000
  SESSION_SECRET=<a long random secret>     # CHANGE THIS
  SECURE_COOKIES=1                           # ok — Caddy provides HTTPS
  LEDGER_MODE=production                      # real tx only, synthetic purged
  ```
- [ ] Enable the service: `sudo systemctl daemon-reload && sudo systemctl enable sagi`

## Phase 3 — Deploy the build

- [ ] From your local repo, make sure `main` is up to date (`git pull`).
- [ ] Run the release script (rsync → `npm ci` → `npm run build` → restart service):
  ```bash
  ./scripts/release.sh deploy@<server-ip> /var/www/sagi sagi
  ```
- [ ] First deploy only: confirm the service came up — the script prints
  `systemctl status sagi` at the end (look for `active (running)`).

## Phase 4 — Verify

- [ ] `https://sagi.network/` → the marketing landing page (S00–S10).
- [ ] `https://sagi.network/app` → the dashboard (redirects to `/app/login` if not signed in).
- [ ] `https://sagi.network/health` → API health check responds.
- [ ] Valid TLS padlock (no cert warning). `curl -I https://sagi.network` shows `HTTP/2 200`.
- [ ] Refresh directly on `https://sagi.network/app/tokens` → loads (SPA fallback works, no 404).

---

## Notes & gotchas

- **`BASE_PATH` stays `/`.** The landing is at the domain root, so do **not** set
  `BASE_PATH` (that's only for sub-path hosting like `/sagi`).
- **`@types/react-dom`:** the production build runs `tsc` during
  `npm run build -w @sagi/web`. On the server this is fine because `npm ci`
  installs devDependencies (which include `@types/react-dom`). If you ever build
  on a machine where it's missing, run `npm install` first.
- **Updating later:** just re-run `./scripts/release.sh deploy@<server-ip>`.
  Every run does `npm ci && npm run build` and restarts the service.
- **Logs / restart on the server:**
  - `sudo journalctl -u sagi -f` — tail app logs
  - `sudo systemctl restart sagi` — restart the app
  - `sudo systemctl reload caddy` — reload after a Caddyfile change
- **Backend data:** the dashboard needs the API + its SQLite ledger
  (`LEDGER_DB_PATH`, default under `runs/`, git-ignored). The landing page itself
  is fully static and needs no backend.

## Alternative — managed host (Render / Railway / Fly.io)

The whole app runs as one service: **build** `npm run build`, **start**
`npm run start`, listening on `$PORT`. If you'd rather not manage a VPS:

- [ ] Create a Web Service from this repo; Build = `npm run build`, Start = `npm run start`.
- [ ] Set env vars: `SESSION_SECRET`, `SECURE_COOKIES=1`, `LEDGER_MODE=production` (`PORT` is provided by the platform).
- [ ] Add `sagi.network` as a custom domain in the platform dashboard and follow
      its DNS instructions (it handles TLS for you). Caddy/systemd are not needed in this case.
