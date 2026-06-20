import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { RunConfig, RunOutcome } from "@sagi/evolution";

export type RunMode = "train" | "replay";

export interface StoredRun {
  id: string;
  mode: RunMode;
  createdAt: string;
  config: RunConfig;
  outcome: RunOutcome;
}

const runsDir = path.resolve(process.cwd(), "runs");

function runPath(id: string): string {
  return path.join(runsDir, `${id}.json`);
}

export async function saveRun(mode: RunMode, config: RunConfig, outcome: RunOutcome): Promise<StoredRun> {
  await mkdir(runsDir, { recursive: true });

  const record: StoredRun = {
    id: crypto.randomUUID(),
    mode,
    createdAt: new Date().toISOString(),
    config,
    outcome
  };

  await writeFile(runPath(record.id), JSON.stringify(record, null, 2));
  return record;
}

export async function loadRun(id: string): Promise<StoredRun | null> {
  try {
    const raw = await readFile(runPath(id), "utf8");
    return JSON.parse(raw) as StoredRun;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : "";
    if (code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
