# SAGI MVP

Minimal TypeScript monorepo for a hackathon MVP:

- `apps/web`: Vite-powered vanilla TypeScript dashboard
- `apps/api`: Express API
- `packages/shared`: shared types and mock dashboard data

## Commands

```bash
npm install
npm run dev
```

The web app runs on `http://localhost:5173` and proxies API requests to `http://localhost:4000`.

## Build

```bash
npm run build
```
