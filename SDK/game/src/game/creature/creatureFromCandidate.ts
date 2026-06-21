// Adapter: SDK candidate -> a synthetic gene + phenotype for the real creature
// renderer. The renderer reads `gene.weights` purely positionally (modulo length),
// so we fabricate a deterministic weight array from the candidate seed and bias a
// handful of indices from the visible stats so each model's body embodies its genome.
import type { CandidateParams } from "../../sdk";
import { hashSeed, mulberry32 } from "../combatantFromCandidate";
import { createCreaturePhenotype, type CreaturePhenotype, type EvolutionGene } from "./creatureLibrary";

// Cover the highest weight index the renderer reads (~272, in the arms block) with
// headroom — below that, high indices would alias onto low ones and creatures would
// look the same.
const WEIGHTS_LENGTH = 320;

// sampleMorph applies sigmoid(weight * gain) with gains ~1.3–1.9. Scaling raw
// weights to ±2.6 makes the sigmoid span ~(0.01, 0.99) instead of clustering at 0.5,
// so the full range of archetypes / leg counts / proportions is reachable.
const SCALE = 2.6;
const toWeight = (unit01: number) => (unit01 * 2 - 1) * SCALE;

// Normalise a 1..50 genome stat to 0..1.
const n = (v: number) => Math.max(0, Math.min(1, (v - 1) / 49));

export interface CreatureGene {
  gene: EvolutionGene;
  phenotype: CreaturePhenotype;
}

export function creatureFromCandidate(params: CandidateParams): CreatureGene {
  const rng = mulberry32(hashSeed(params.seed));
  const weights = Array.from({ length: WEIGHTS_LENGTH }, () => toWeight(rng()));

  // Bias the morphology-driving indices read by summarizeCreatureGene /
  // getMorphologyParams so the visible spec actually shapes the creature:
  weights[41] = toWeight(n(params.updateComplexity)); // uprightness -> archetype
  weights[43] = toWeight(n(params.layers));           // leg pairs
  weights[46] = toWeight(n(params.neuronTypes));      // spine segments (body length)
  weights[4] = toWeight(n(params.neuronParams));      // torso radius
  weights[6] = toWeight(n(params.synapseStateParams)); // head radius

  const gene: EvolutionGene = {
    weights,
    // Constant architecture — only feeds the renderer's useMemo dep array, never
    // morphology. Values are arbitrary but stable per gene.
    architecture: { neuronStateSize: 32, synapseStateSize: 0, outputGain: 1 },
  };

  return { gene, phenotype: createCreaturePhenotype(params.seed) };
}
