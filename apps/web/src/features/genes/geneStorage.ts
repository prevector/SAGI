import {
  createRandomGene,
  makeRng,
  normalizeGene,
  type EvolutionGene
} from "@sagi/evolution";

const STORAGE_KEY = "sagi.genes.v1";
const MAX_STORED_GENES = 32;

function trimGenesForStorage(genes: EvolutionGene[], limit = MAX_STORED_GENES): EvolutionGene[] {
  if (genes.length <= limit) {
    return genes;
  }
  return [...genes]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, limit);
}

function writeGenesPayload(genes: EvolutionGene[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(genes));
}

export function loadGenes(): EvolutionGene[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [createSeedGene()];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [createSeedGene()];
    }
    return ensurePaperSeed(parsed.map((gene) => normalizeGene(gene as EvolutionGene)));
  } catch {
    return [createSeedGene()];
  }
}

export function saveGenes(genes: EvolutionGene[]): void {
  const trimmed = trimGenesForStorage(genes);

  try {
    writeGenesPayload(trimmed);
    return;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      throw error;
    }
  }

  for (const limit of [16, 8, 4, 2, 1]) {
    try {
      writeGenesPayload(trimGenesForStorage(genes, limit));
      console.warn(`Gene storage trimmed to ${limit} genes due to local storage quota.`);
      return;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        throw error;
      }
    }
  }

  throw new Error("Failed to persist genes to local storage after quota trimming.");
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}

export function createSeedGene(): EvolutionGene {
  return createRandomGene(makeRng("initial-gene"), {
    name: "Paper IAF seed gene",
    notes: "Single-ENU IAF starter matching the paper preset: 32 neuron states, no synapse compartment, spike output gain 1000.",
    architecture: {
      neuronStateSize: 32,
      synapseStateSize: 0,
      outputGain: 1000
    }
  });
}

function ensurePaperSeed(genes: EvolutionGene[]): EvolutionGene[] {
  const hasPaperSeed = genes.some((gene) =>
    gene.architecture.neuronStateSize === 32 &&
    gene.architecture.synapseStateSize === 0 &&
    gene.architecture.outputGain === 1000
  );
  return hasPaperSeed ? genes : [createSeedGene(), ...genes];
}

export function upsertGene(genes: EvolutionGene[], gene: EvolutionGene): EvolutionGene[] {
  const index = genes.findIndex((item) => item.id === gene.id);
  if (index === -1) {
    return [gene, ...genes];
  }
  const next = genes.slice();
  next[index] = gene;
  return next;
}
