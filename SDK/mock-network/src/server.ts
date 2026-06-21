import path from "node:path";
import express from "express";
import cors from "cors";
import { sagiRouter } from "./routes/sagi.js";

const app = express();
const port = Number(process.env.PORT ?? 8000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => { res.json({ ok: true }); });
app.use("/api/sagi", sagiRouter);

// Production single-container demo: when SERVE_STATIC_DIR is set, this process also
// serves the built game (SDK/game/dist) from the same origin, so the game's relative
// `/api/sagi` calls hit the mock above — no CORS, no extra service. Unset in dev
// (the game runs on Vite :5174 and proxies /api here), so dev behaviour is unchanged.
const staticDir = process.env.SERVE_STATIC_DIR;
if (staticDir) {
  const root = path.resolve(staticDir);
  app.use(express.static(root));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    res.sendFile(path.join(root, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`SAGI mock-network listening on http://localhost:${port}`);
});
