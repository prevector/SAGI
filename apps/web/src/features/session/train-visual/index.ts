// Public surface of the compute/train genome-field visual. The page imports
// only the default export (lazily); types are re-exported for the page props.

export { default } from "./GenomeField";
export type { GenomeFieldProps } from "./GenomeField";
export type {
  Genome,
  PopulationSim,
  PopulationSource,
  PopulationStats,
  PopulationUpdate,
  Seed,
} from "./sim/types";
