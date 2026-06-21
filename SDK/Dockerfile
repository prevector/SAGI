# SAGI demo — single container: the mock-network server (Express) serves the
# built game (static PWA) from the same origin, so the game's relative /api/sagi
# calls hit the mock with no CORS and no second service. One Coolify app.
#
# Coolify: Build Pack = Dockerfile, Base Directory = /SDK, Port = 8000.

# ---- 1. build the game (static) ----
FROM node:20-alpine AS game
WORKDIR /game
COPY game/package.json game/package-lock.json ./
RUN npm ci
COPY game/ ./
RUN npm run build

# ---- 2. runtime: mock-network + the game's dist ----
FROM node:20-alpine AS runtime
WORKDIR /app
COPY mock-network/package.json mock-network/package-lock.json ./
RUN npm ci
COPY mock-network/ ./
COPY --from=game /game/dist ./public

ENV NODE_ENV=production
ENV PORT=8000
ENV SERVE_STATIC_DIR=/app/public
EXPOSE 8000

# Health endpoint for Coolify: GET /health -> { ok: true }
CMD ["npm", "run", "start"]
