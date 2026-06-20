export interface GaConfig {
  populationSize: number;
  eliteCount: number;
  tournamentSize: number;
  crossoverRate: number;
  mutationRate: number;
  mutationStd: number;
  immigrantCount: number;
  hiddenUnits: number;
  maxGenerations: number;
}

export const DEFAULT_GA_CONFIG: GaConfig = {
  populationSize: 80,
  eliteCount: 4,
  tournamentSize: 3,
  crossoverRate: 0.6,
  mutationRate: 0.12,
  mutationStd: 0.18,
  immigrantCount: 3,
  hiddenUnits: 8,
  maxGenerations: 120
};
