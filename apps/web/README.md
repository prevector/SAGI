# @sagi/web — SAGI dashboard

The mock-first React dashboard for SAGI. Dark variant of the `DESIGN.md` system
(Geist + Geist Mono, near-black surfaces, teal = intelligence, orange = economy,
colorblind-safe by rule).

## Run

```bash
npm run dev      # from repo root: api on :4000, web on :5173 (proxied)
```

Local dev auto-authenticates (no login). Production asks for a username and
stores a signed cookie (handled by `@sagi/api`).

## Architecture

- **Types** live in `@sagi/shared` (`Domain` namespace) — the one contract for
  web, mock, and the future engine. `src/lib/types.ts` re-exports them flat.
- **Data** goes through one interface: `src/lib/api.ts` (`Api`). Components only
  import `api`. Today it resolves to `mockApi`; flip `config.useMock` to use the
  engine.
- **Design tokens**: `src/styles/tokens.css` (hex from `DESIGN.md`) + CSS
  Modules. No hardcoded colours/fonts.
- **Features**: `src/features/<name>/` owns a feature's widget(s) and helpers;
  `src/pages/<Name>Page.tsx` is the full-screen view. Shared primitives in
  `src/components/ui`.
- **Sub-path hosting**: set `BASE_PATH=/sagi` for the build; the router basename
  and API paths follow `import.meta.env.BASE_URL`.

## Swapping in the real engine

1. Implement `src/lib/http.ts` (`httpApi`) against the engine routes (mapping is
   documented in that file and in `PLAN.md`). Realtime `subscribeNetwork` needs
   a WS/SSE channel.
2. Set `config.useMock = false` (or wire it to an env flag).

No component changes are required — the `Api` interface is the only seam.
