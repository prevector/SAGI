import express from "express";
import cors from "cors";
import { sagiRouter } from "./routes/sagi.js";

const app = express();
const port = Number(process.env.PORT ?? 8000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => { res.json({ ok: true }); });
app.use("/api/sagi", sagiRouter);

app.listen(port, () => {
  console.log(`SAGI mock-network listening on http://localhost:${port}`);
});
