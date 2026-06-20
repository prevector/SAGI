import cors from "cors";
import express from "express";
import { getDashboardSnapshot } from "@sagi/shared";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());

app.get("/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/dashboard", (_request, response) => {
  response.json(getDashboardSnapshot());
});

app.listen(port, () => {
  console.log(`SAGI API listening on http://localhost:${port}`);
});
