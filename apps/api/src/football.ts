import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  footballGenomeLength,
  normalizeGene,
  runFootballTournament,
  simulateFootballMatch,
  type EvolutionGene
} from "@sagi/evolution";
import type {
  FootballLeaderboardDivision,
  FootballLeaderboardRow,
  FootballLeaderboardSnapshot,
  FootballTeamSubmissionPayload,
  FootballTeamSubmissionRecord
} from "@sagi/shared";

const footballDir = path.resolve(process.cwd(), "runs", "football");
const submissionsPath = path.join(footballDir, "submissions.json");
const leaderboardPath = path.join(footballDir, "leaderboard.json");
const MAX_LEADERBOARD_ROWS = 10;

function divisionKey(submission: FootballTeamSubmissionRecord): string {
  const football = submission.bestFootball;
  return `${football.hiddenSize}:${football.teamSize}:${football.matchTicks}`;
}

async function ensureFootballDir() {
  await mkdir(footballDir, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : "";
    if (code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await ensureFootballDir();
  await writeFile(filePath, JSON.stringify(value, null, 2));
}

function asEvolutionGene(value: FootballTeamSubmissionPayload["gene"]): EvolutionGene {
  return normalizeGene(value as EvolutionGene);
}

function normalizeSubmission(username: string, payload: FootballTeamSubmissionPayload): FootballTeamSubmissionRecord {
  const creatureId = payload.creatureId.trim();
  const creatureName = payload.creatureName.trim();
  if (!creatureId) {
    throw new Error("creatureId is required.");
  }
  if (!creatureName) {
    throw new Error("creatureName is required.");
  }

  const gene = asEvolutionGene(payload.gene);
  const football = payload.bestFootball;
  if (!football) {
    throw new Error("bestFootball is required.");
  }

  const expectedGenomeLength = footballGenomeLength(football.hiddenSize);
  if (football.genome.length !== expectedGenomeLength) {
    throw new Error(`Football genome length mismatch: expected ${expectedGenomeLength}, received ${football.genome.length}.`);
  }

  return {
    username,
    submittedAt: new Date().toISOString(),
    creatureId,
    creatureName,
    gene,
    phenotype: payload.phenotype,
    bestToken: payload.bestToken ?? null,
    bestFootball: {
      ...football,
      genome: [...football.genome]
    }
  };
}

async function loadSubmissions(): Promise<FootballTeamSubmissionRecord[]> {
  return readJsonFile<FootballTeamSubmissionRecord[]>(submissionsPath, []);
}

async function saveSubmissions(submissions: FootballTeamSubmissionRecord[]): Promise<void> {
  await writeJsonFile(submissionsPath, submissions);
}

async function saveLeaderboard(snapshot: FootballLeaderboardSnapshot): Promise<void> {
  await writeJsonFile(leaderboardPath, snapshot);
}

function buildLeaderboard(submissions: FootballTeamSubmissionRecord[]): FootballLeaderboardSnapshot {
  const updatedAt = new Date().toISOString();
  const grouped = new Map<string, FootballTeamSubmissionRecord[]>();
  for (const submission of submissions) {
    const key = divisionKey(submission);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(submission);
    } else {
      grouped.set(key, [submission]);
    }
  }

  const divisions: FootballLeaderboardDivision[] = [...grouped.entries()]
    .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
    .map(([key, divisionSubmissions]) => {
      const entrants = [...divisionSubmissions].sort((left, right) => (
        left.username.localeCompare(right.username) ||
        left.creatureId.localeCompare(right.creatureId)
      ));
      const first = entrants[0]!;
      const genomes = entrants.map((entry) => Float32Array.from(entry.bestFootball.genome));
      const tournament = runFootballTournament(genomes, first.bestFootball.hiddenSize, {
        seed: `server-football:${key}:${updatedAt}`,
        teamSize: first.bestFootball.teamSize,
        maxTicks: first.bestFootball.matchTicks
      });

      const rows = entrants
        .map((entry, index) => ({
          rank: 0,
          username: entry.username,
          creatureId: entry.creatureId,
          creatureName: entry.creatureName,
          hiddenSize: entry.bestFootball.hiddenSize,
          teamSize: entry.bestFootball.teamSize,
          matchTicks: entry.bestFootball.matchTicks,
          selfScore: entry.bestFootball.bestScore,
          verifiedScore: tournament.scores[index] ?? Number.NEGATIVE_INFINITY,
          submittedAt: entry.submittedAt,
          phenotype: entry.phenotype
        } satisfies FootballLeaderboardRow))
        .sort((left, right) => (
          right.verifiedScore - left.verifiedScore ||
          right.selfScore - left.selfScore ||
          left.username.localeCompare(right.username)
        ))
        .map((row, index) => ({ ...row, rank: index + 1 }));

      const champion = rows[0] ?? null;
      return {
        key,
        hiddenSize: first.bestFootball.hiddenSize,
        teamSize: first.bestFootball.teamSize,
        matchTicks: first.bestFootball.matchTicks,
        entrants: rows.length,
        updatedAt,
        championCreatureId: champion?.creatureId ?? null,
        championUsername: champion?.username ?? null,
        previewScore: tournament.preview.score,
        previewWinner: tournament.preview.winner,
        rows: rows.slice(0, MAX_LEADERBOARD_ROWS),
        tournament: {
          entrants: entrants.map((entry, index) => ({
            index,
            username: entry.username,
            creatureId: entry.creatureId,
            creatureName: entry.creatureName
          })),
          matches: tournament.matches.map((match) => ({
            id: match.id,
            round: match.round,
            slot: match.slot,
            leftIndex: match.leftIndex,
            rightIndex: match.rightIndex,
            winnerIndex: match.winnerIndex,
            score: match.score,
            fitness: match.fitness
          }))
        }
      } satisfies FootballLeaderboardDivision;
    });

  return { updatedAt, divisions };
}

function pruneSubmissionsToLeaderboard(
  submissions: FootballTeamSubmissionRecord[],
  leaderboard: FootballLeaderboardSnapshot
): FootballTeamSubmissionRecord[] {
  const keepIds = new Set(
    leaderboard.divisions.flatMap((division) => (
      division.rows.slice(0, MAX_LEADERBOARD_ROWS).map((row) => row.creatureId)
    ))
  );
  return submissions.filter((submission) => keepIds.has(submission.creatureId));
}

function isCurrentLeaderboardSnapshot(snapshot: FootballLeaderboardSnapshot | null): boolean {
  return Boolean(snapshot?.divisions.every((division) => (
    division.rows.length <= MAX_LEADERBOARD_ROWS &&
    Array.isArray(division.tournament?.entrants) &&
    Array.isArray(division.tournament?.matches)
  )));
}

export async function getFootballLeaderboard(): Promise<FootballLeaderboardSnapshot> {
  const stored = await readJsonFile<FootballLeaderboardSnapshot | null>(leaderboardPath, null);
  if (isCurrentLeaderboardSnapshot(stored)) {
    return stored!;
  }

  const submissions = await loadSubmissions();
  const snapshot = buildLeaderboard(submissions);
  const pruned = pruneSubmissionsToLeaderboard(submissions, snapshot);
  if (pruned.length !== submissions.length) {
    await saveSubmissions(pruned);
  }
  await saveLeaderboard(snapshot);
  return snapshot;
}

export async function submitFootballTeam(
  username: string,
  payload: FootballTeamSubmissionPayload
): Promise<{ submission: FootballTeamSubmissionRecord; leaderboard: FootballLeaderboardSnapshot }> {
  const submission = normalizeSubmission(username, payload);
  const submissions = await loadSubmissions();
  const next = submissions.filter((entry) => entry.username !== username);
  next.push(submission);
  const leaderboard = buildLeaderboard(next);
  await saveSubmissions(pruneSubmissionsToLeaderboard(next, leaderboard));
  await saveLeaderboard(leaderboard);
  return { submission, leaderboard };
}

export async function simulateSubmittedFootballMatch(
  leftCreatureId: string,
  rightCreatureId: string
) {
  const submissions = await loadSubmissions();
  const left = submissions.find((entry) => entry.creatureId === leftCreatureId);
  const right = submissions.find((entry) => entry.creatureId === rightCreatureId);
  if (!left || !right) {
    throw new Error("Both submitted teams must exist.");
  }
  const leftFootball = left.bestFootball;
  const rightFootball = right.bestFootball;
  if (
    leftFootball.hiddenSize !== rightFootball.hiddenSize ||
    leftFootball.teamSize !== rightFootball.teamSize ||
    leftFootball.matchTicks !== rightFootball.matchTicks
  ) {
    throw new Error("Submitted teams must share hiddenSize, teamSize, and matchTicks.");
  }

  return simulateFootballMatch(
    Float32Array.from(leftFootball.genome),
    Float32Array.from(rightFootball.genome),
    leftFootball.hiddenSize,
    {
      seed: `server-football:match:${leftCreatureId}:${rightCreatureId}:${Date.now()}`,
      teamSize: leftFootball.teamSize,
      maxTicks: leftFootball.matchTicks
    }
  );
}
