// PopulationSource = local — wraps the in-browser PopulationSim. The default;
// runs entirely client-side, deterministic from session.id.

import type { PopulationSource, Seed } from "./types";
import { PopulationSim } from "./PopulationSim";

export interface LocalSource extends Extract<PopulationSource, { kind: "local" }> {
  sim: PopulationSim;
}

export function createLocalSource(seed: Seed): LocalSource {
  const sim = new PopulationSim(seed);
  return { kind: "local", sim };
}
