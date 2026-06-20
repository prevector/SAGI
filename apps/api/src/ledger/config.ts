// Ledger runtime config, derived from the app env. The emission curve comes
// from the locked defaults (E0=1.05M, r=0.95 => 21M cap), with optional env
// overrides for tuning a demo.

import { type EmissionConfig, type LedgerMode, defaultEmissionConfig, toBase } from "@sagi/ledger";
import type { AppEnv } from "../env.js";

export interface LedgerConfig {
  mode: LedgerMode;
  seed: number;
  dbPath: string;
  emission: EmissionConfig;
  // Demo genesis fixtures size.
  genesisUsers: number;
  genesisDays: number;
}

export function buildLedgerConfig(env: AppEnv): LedgerConfig {
  const emission = defaultEmissionConfig(env.ledgerMode);
  if (process.env.LEDGER_E0) emission.E0 = toBase(process.env.LEDGER_E0);
  if (process.env.LEDGER_R) emission.r = Number(process.env.LEDGER_R);
  if (process.env.LEDGER_EPOCH_MS) emission.epochMs = Number(process.env.LEDGER_EPOCH_MS);

  return {
    mode: env.ledgerMode,
    seed: env.ledgerSeed,
    dbPath: env.dbPath,
    emission,
    genesisUsers: Number(process.env.LEDGER_GENESIS_USERS ?? 12),
    genesisDays: Number(process.env.LEDGER_GENESIS_DAYS ?? 30)
  };
}
