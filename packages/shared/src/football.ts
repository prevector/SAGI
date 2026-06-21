export interface SharedEvolutionArchitecture {
  neuronStateSize: number;
  synapseStateSize: number;
  inputChannels: number;
  outputChannels: number;
  outputGain: number;
}

export interface SharedEvolutionGene {
  id: string;
  name: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  architecture: SharedEvolutionArchitecture;
  weights: number[];
  notes?: string;
}

export interface SharedCreaturePhenotype {
  id: string;
  paletteKey: string;
  paletteName: string;
  hueFrom: number;
  hueTo: number;
  bodyFrom: string;
  bodyTo: string;
  accent: string;
  limb: string;
  crest: string;
  cool: string;
  eye: string;
}

export interface SharedStoredTokenBrain {
  hiddenSize: number;
  loss: number;
  accuracy: number;
  bestLoss: number;
  bestAccuracy: number;
  genome: number[];
  updatedAt: string;
}

export interface SharedStoredFootballBrain {
  hiddenSize: number;
  teamSize: number;
  matchTicks: number;
  score: number;
  bestScore: number;
  genome: number[];
  updatedAt: string;
}

export interface FootballTeamSubmissionPayload {
  creatureId: string;
  creatureName: string;
  gene: SharedEvolutionGene;
  phenotype: SharedCreaturePhenotype;
  bestToken?: SharedStoredTokenBrain | null;
  bestFootball: SharedStoredFootballBrain;
}

export interface FootballTeamSubmissionRecord extends FootballTeamSubmissionPayload {
  username: string;
  submittedAt: string;
}

export interface FootballLeaderboardRow {
  rank: number;
  username: string;
  creatureId: string;
  creatureName: string;
  hiddenSize: number;
  teamSize: number;
  matchTicks: number;
  selfScore: number;
  verifiedScore: number;
  submittedAt: string;
  phenotype: SharedCreaturePhenotype;
}

export interface FootballLeaderboardDivision {
  key: string;
  hiddenSize: number;
  teamSize: number;
  matchTicks: number;
  entrants: number;
  updatedAt: string;
  championCreatureId: string | null;
  championUsername: string | null;
  previewScore: [number, number];
  previewWinner: 0 | 1 | -1;
  rows: FootballLeaderboardRow[];
}

export interface FootballLeaderboardSnapshot {
  updatedAt: string;
  divisions: FootballLeaderboardDivision[];
}

