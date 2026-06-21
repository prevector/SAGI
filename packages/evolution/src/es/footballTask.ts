import { ControlGruModel, controlGruGenomeLength, type ControlGruShape } from "./controlGru.js";
import { makeRng, type RNG } from "../rng.js";

export interface FootballTaskConfig {
  seed: string;
  fieldWidth?: number;
  fieldHeight?: number;
  goalSize?: number;
  goalDepth?: number;
  teamSize?: number;
  maxTicks?: number;
  playerRadius?: number;
  ballRadius?: number;
  maxSpeed?: number;
  acceleration?: number;
  turnRate?: number;
  kickStrength?: number;
  touchReward?: number;
  possessionReward?: number;
  goalReward?: number;
  collisionPenalty?: number;
}

export interface FootballPlayerState {
  x: number;
  y: number;
  heading: number;
  radius: number;
}

export interface FootballBallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface FootballMatchSnapshot {
  tick: number;
  ball: FootballBallState;
  teams: [FootballPlayerState[], FootballPlayerState[]];
  score: [number, number];
  possession: -1 | 0 | 1;
}

export interface FootballMatchResult {
  winner: 0 | 1 | -1;
  score: [number, number];
  fitness: [number, number];
  collisions: [number, number];
  possessionTicks: [number, number];
}

export interface FootballTournamentResult {
  scores: Float64Array;
  championIndex: number;
  runnerUpIndex: number;
  preview: FootballMatchResult;
  matches: FootballTournamentMatch[];
}

export interface FootballTournamentMatch {
  id: string;
  round: number;
  slot: number;
  leftIndex: number;
  rightIndex: number | null;
  winnerIndex: number;
  score: [number, number] | null;
  fitness: [number, number] | null;
}

interface PlayerRuntime {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  hidden: Float32Array;
  output: Float32Array;
  kickCooldown: number;
}

interface TeamRuntime {
  players: PlayerRuntime[];
  score: number;
  touches: number;
  possessionTicks: number;
  collisions: number;
}

interface BallRuntime {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export const FOOTBALL_INPUT_SIZE = 8;
export const FOOTBALL_OUTPUT_SIZE = 5;

export function createFootballGruShape(hiddenSize: number): ControlGruShape {
  return {
    inputSize: FOOTBALL_INPUT_SIZE,
    hiddenSize,
    outputSize: FOOTBALL_OUTPUT_SIZE
  };
}

export function footballGenomeLength(hiddenSize: number): number {
  return controlGruGenomeLength(createFootballGruShape(hiddenSize));
}

export function footballInputLabels(): readonly string[] {
  return [
    "ball distance",
    "ball angle",
    "goal distance",
    "goal angle",
    "nearest teammate distance",
    "nearest teammate angle",
    "nearest opponent distance",
    "nearest opponent angle"
  ] as const;
}

export function defaultFootballConfig(seed: string): Required<FootballTaskConfig> {
  return {
    seed,
    fieldWidth: 110,
    fieldHeight: 70,
    goalSize: 20,
    goalDepth: 8,
    teamSize: 4,
    maxTicks: 720,
    playerRadius: 1,
    ballRadius: 0.7,
    maxSpeed: 0.42,
    acceleration: 0.1,
    turnRate: 0.6,
    kickStrength: 0.45,
    touchReward: 0.08,
    possessionReward: 0.012,
    goalReward: 24,
    collisionPenalty: 0.014
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function distance(aX: number, aY: number, bX: number, bY: number): number {
  const dx = bX - aX;
  const dy = bY - aY;
  return Math.sqrt(dx * dx + dy * dy);
}

function tracePlayer(player: PlayerRuntime, radius: number): FootballPlayerState {
  return { x: player.x, y: player.y, heading: player.heading, radius };
}

function traceBall(ball: BallRuntime, radius: number): FootballBallState {
  return { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, radius };
}

function createTeamRuntime(config: Required<FootballTaskConfig>, side: 0 | 1, hiddenSize: number): TeamRuntime {
  const players: PlayerRuntime[] = [];
  const baseX = side === 0 ? config.fieldWidth * 0.2 : config.fieldWidth * 0.8;
  const spacing = config.fieldHeight / (config.teamSize + 1);
  for (let index = 0; index < config.teamSize; index += 1) {
    players.push({
      x: baseX,
      y: spacing * (index + 1),
      vx: 0,
      vy: 0,
      heading: side === 0 ? 0 : Math.PI,
      hidden: new Float32Array(hiddenSize),
      output: new Float32Array(FOOTBALL_OUTPUT_SIZE),
      kickCooldown: 0
    });
  }
  return {
    players,
    score: 0,
    touches: 0,
    possessionTicks: 0,
    collisions: 0
  };
}

function resetFormation(config: Required<FootballTaskConfig>, teams: [TeamRuntime, TeamRuntime], ball: BallRuntime, rng: RNG) {
  for (let side = 0 as 0 | 1; side <= 1; side = (side + 1) as 0 | 1) {
    const team = teams[side];
    const baseX = side === 0 ? config.fieldWidth * 0.2 : config.fieldWidth * 0.8;
    const spacing = config.fieldHeight / (config.teamSize + 1);
    for (let index = 0; index < team.players.length; index += 1) {
      const player = team.players[index];
      const laneY = spacing * (index + 1);
      player.x = clamp(baseX + (rng() * 2 - 1) * 2.2, config.playerRadius, config.fieldWidth - config.playerRadius);
      player.y = clamp(laneY + (rng() * 2 - 1) * 2.6, config.playerRadius, config.fieldHeight - config.playerRadius);
      player.vx = 0;
      player.vy = 0;
      player.heading = normalizeAngle((side === 0 ? 0 : Math.PI) + (rng() * 2 - 1) * 0.24);
      player.kickCooldown = 0;
      player.hidden.fill(0);
      player.output.fill(0);
    }
  }
  ball.x = config.fieldWidth / 2;
  ball.y = clamp(config.fieldHeight / 2 + (rng() * 2 - 1) * 3, config.ballRadius, config.fieldHeight - config.ballRadius);
  ball.vx = 0;
  ball.vy = 0;
}

function resetMatchStats(teams: [TeamRuntime, TeamRuntime]) {
  for (const team of teams) {
    team.score = 0;
    team.touches = 0;
    team.possessionTicks = 0;
    team.collisions = 0;
  }
}

function goalCenter(config: Required<FootballTaskConfig>, attackingSide: 0 | 1) {
  return {
    x: attackingSide === 0 ? config.fieldWidth : 0,
    y: config.fieldHeight / 2
  };
}

function getGoalBounds(config: Required<FootballTaskConfig>, side: 0 | 1) {
  const halfGoal = config.goalSize / 2;
  const centerY = config.fieldHeight / 2;
  return {
    left: side === 0 ? -config.goalDepth : config.fieldWidth,
    right: side === 0 ? 0 : config.fieldWidth + config.goalDepth,
    top: centerY - halfGoal,
    bottom: centerY + halfGoal
  };
}

function detectGoal(config: Required<FootballTaskConfig>, ball: BallRuntime): 0 | 1 | null {
  const leftGoal = getGoalBounds(config, 0);
  if (
    ball.x - config.ballRadius <= leftGoal.right &&
    ball.x + config.ballRadius >= leftGoal.left &&
    ball.y + config.ballRadius >= leftGoal.top &&
    ball.y - config.ballRadius <= leftGoal.bottom
  ) {
    return 1;
  }

  const rightGoal = getGoalBounds(config, 1);
  if (
    ball.x + config.ballRadius >= rightGoal.left &&
    ball.x - config.ballRadius <= rightGoal.right &&
    ball.y + config.ballRadius >= rightGoal.top &&
    ball.y - config.ballRadius <= rightGoal.bottom
  ) {
    return 0;
  }

  return null;
}

function nearestFromTeam(
  teams: [TeamRuntime, TeamRuntime],
  ownSide: 0 | 1,
  player: PlayerRuntime,
  targetSide: 0 | 1,
  excludeSelf: boolean
): PlayerRuntime | null {
  let best: PlayerRuntime | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const other of teams[targetSide].players) {
    if (excludeSelf && targetSide === ownSide && other === player) continue;
    const d = distance(player.x, player.y, other.x, other.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = other;
    }
  }
  return best;
}

function observe(
  config: Required<FootballTaskConfig>,
  teams: [TeamRuntime, TeamRuntime],
  ownSide: 0 | 1,
  player: PlayerRuntime,
  ball: BallRuntime
): Float32Array {
  const goal = goalCenter(config, ownSide);
  const nearestTeammate = nearestFromTeam(teams, ownSide, player, ownSide, true);
  const nearestOpponent = nearestFromTeam(teams, ownSide, player, ownSide === 0 ? 1 : 0, false);
  const maxDistance = Math.sqrt(config.fieldWidth * config.fieldWidth + config.fieldHeight * config.fieldHeight);

  return Float32Array.from([
    clamp(distance(player.x, player.y, ball.x, ball.y) / maxDistance, 0, 1),
    normalizeAngle(Math.atan2(ball.y - player.y, ball.x - player.x) - player.heading) / Math.PI,
    clamp(distance(player.x, player.y, goal.x, goal.y) / maxDistance, 0, 1),
    normalizeAngle(Math.atan2(goal.y - player.y, goal.x - player.x) - player.heading) / Math.PI,
    nearestTeammate ? clamp(distance(player.x, player.y, nearestTeammate.x, nearestTeammate.y) / maxDistance, 0, 1) : 1,
    nearestTeammate ? normalizeAngle(Math.atan2(nearestTeammate.y - player.y, nearestTeammate.x - player.x) - player.heading) / Math.PI : 0,
    nearestOpponent ? clamp(distance(player.x, player.y, nearestOpponent.x, nearestOpponent.y) / maxDistance, 0, 1) : 1,
    nearestOpponent ? normalizeAngle(Math.atan2(nearestOpponent.y - player.y, nearestOpponent.x - player.x) - player.heading) / Math.PI : 0
  ]);
}

function resolvePlayerCollision(left: PlayerRuntime, right: PlayerRuntime, radius: number) {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const distanceNow = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const minDistance = radius * 2;
  if (distanceNow >= minDistance) return false;
  const overlap = minDistance - distanceNow;
  const nx = dx / distanceNow;
  const ny = dy / distanceNow;
  left.x -= nx * overlap * 0.5;
  left.y -= ny * overlap * 0.5;
  right.x += nx * overlap * 0.5;
  right.y += ny * overlap * 0.5;
  left.vx -= nx * 0.03;
  left.vy -= ny * 0.03;
  right.vx += nx * 0.03;
  right.vy += ny * 0.03;
  return true;
}

function resolveBallContact(config: Required<FootballTaskConfig>, player: PlayerRuntime, ball: BallRuntime, kick: number) {
  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const currentDistance = Math.sqrt(dx * dx + dy * dy) || 0.0001;
  const minDistance = config.playerRadius + config.ballRadius;
  if (currentDistance >= minDistance) return false;
  const nx = dx / currentDistance;
  const ny = dy / currentDistance;
  const overlap = minDistance - currentDistance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const playerSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
  ball.vx += nx * (0.08 + playerSpeed * 0.18);
  ball.vy += ny * (0.08 + playerSpeed * 0.18);

  if (kick > 0.25 && player.kickCooldown <= 0) {
    const angle = player.heading + player.output[3] * (Math.PI / 2);
    const strength = (player.output[4] + 1) * config.kickStrength;
    ball.vx = Math.cos(angle) * strength + player.vx;
    ball.vy = Math.sin(angle) * strength + player.vy;
    player.kickCooldown = 9;
  }

  return true;
}

export class FootballMatchRuntime {
  private readonly config: Required<FootballTaskConfig>;
  private readonly model: ControlGruModel;
  private readonly leftGenome: Float32Array;
  private readonly rightGenome: Float32Array;
  private readonly teams: [TeamRuntime, TeamRuntime];
  private readonly ball: BallRuntime;
  private rng: RNG;
  private episode = 0;
  private possession: -1 | 0 | 1 = -1;
  private tickCount = 0;

  constructor(leftGenome: Float32Array, rightGenome: Float32Array, hiddenSize: number, userConfig: FootballTaskConfig) {
    this.config = { ...defaultFootballConfig(userConfig.seed), ...userConfig };
    this.model = new ControlGruModel(createFootballGruShape(hiddenSize));
    this.leftGenome = leftGenome;
    this.rightGenome = rightGenome;
    this.teams = [
      createTeamRuntime(this.config, 0, hiddenSize),
      createTeamRuntime(this.config, 1, hiddenSize)
    ];
    this.ball = {
      x: this.config.fieldWidth / 2,
      y: this.config.fieldHeight / 2,
      vx: 0,
      vy: 0
    };
    this.rng = makeRng(`${this.config.seed}:episode:0`);
    resetFormation(this.config, this.teams, this.ball, this.rng);
    this.possession = -1;
  }

  restart(seed = `${this.config.seed}:restart:${this.episode + 1}`) {
    this.episode += 1;
    this.tickCount = 0;
    this.possession = -1;
    resetMatchStats(this.teams);
    this.rng = makeRng(seed);
    resetFormation(this.config, this.teams, this.ball, this.rng);
  }

  tick() {
    if (this.tickCount >= this.config.maxTicks) {
      return;
    }
    const { config, teams, ball } = this;
    this.tickCount += 1;

    for (let side = 0 as 0 | 1; side <= 1; side = (side + 1) as 0 | 1) {
      const genome = side === 0 ? this.leftGenome : this.rightGenome;
      const team = teams[side];
      for (const player of team.players) {
        const input = observe(config, teams, side, player, ball);
        const step = this.model.step(genome, input, player.hidden);
        player.hidden = step.hidden;
        player.output = step.output;
        const turnRight = clamp((step.output[1] + 1) * 0.5, 0, 1);
        const turnLeft = clamp((step.output[2] + 1) * 0.5, 0, 1);
        player.heading = normalizeAngle(player.heading + (turnRight - turnLeft) * config.turnRate);
        const drive = clamp((step.output[0] + 1) * 0.5, 0, 1);
        player.vx += Math.cos(player.heading) * config.acceleration * drive;
        player.vy += Math.sin(player.heading) * config.acceleration * drive;
        const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
        if (speed > config.maxSpeed) {
          player.vx = (player.vx / speed) * config.maxSpeed;
          player.vy = (player.vy / speed) * config.maxSpeed;
        }
        player.x += player.vx;
        player.y += player.vy;
        player.vx *= 0.8;
        player.vy *= 0.8;
        player.x = clamp(player.x, config.playerRadius, config.fieldWidth - config.playerRadius);
        player.y = clamp(player.y, config.playerRadius, config.fieldHeight - config.playerRadius);
        player.kickCooldown = Math.max(0, player.kickCooldown - 1);
      }
    }

    for (let side = 0 as 0 | 1; side <= 1; side = (side + 1) as 0 | 1) {
      const team = teams[side];
      for (let own = 0; own < team.players.length; own += 1) {
        for (let other = own + 1; other < team.players.length; other += 1) {
          if (resolvePlayerCollision(team.players[own], team.players[other], config.playerRadius)) {
            team.collisions += 1;
          }
        }
      }
    }
    for (const left of teams[0].players) {
      for (const right of teams[1].players) {
        if (resolvePlayerCollision(left, right, config.playerRadius)) {
          teams[0].collisions += 1;
          teams[1].collisions += 1;
        }
      }
    }

    let touchingSide: -1 | 0 | 1 = this.possession;
    for (let side = 0 as 0 | 1; side <= 1; side = (side + 1) as 0 | 1) {
      const team = teams[side];
      for (const player of team.players) {
        const kick = clamp((player.output[4] + 1) * 0.5, 0, 1);
        if (resolveBallContact(config, player, ball, kick)) {
          touchingSide = side;
          team.touches += 1;
        }
      }
    }
    this.possession = touchingSide;
    if (this.possession === 0 || this.possession === 1) {
      teams[this.possession].possessionTicks += 1;
    }

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= 0.992;
    ball.vy *= 0.992;

    const scorer = detectGoal(config, ball);
    if (scorer !== null) {
      teams[scorer].score += 1;
      this.possession = -1;
      resetFormation(config, teams, ball, this.rng);
      return;
    }

    const inGoalMouth =
      ball.y + config.ballRadius >= config.fieldHeight / 2 - config.goalSize / 2 &&
      ball.y - config.ballRadius <= config.fieldHeight / 2 + config.goalSize / 2;

    if ((ball.x < config.ballRadius || ball.x > config.fieldWidth - config.ballRadius) && !inGoalMouth) {
      ball.x = clamp(ball.x, config.ballRadius, config.fieldWidth - config.ballRadius);
      ball.vx *= -0.9;
    }
    if (ball.y < config.ballRadius || ball.y > config.fieldHeight - config.ballRadius) {
      ball.y = clamp(ball.y, config.ballRadius, config.fieldHeight - config.ballRadius);
      ball.vy *= -0.9;
    }
  }

  snapshot(): FootballMatchSnapshot {
    return {
      tick: this.tickCount,
      ball: traceBall(this.ball, this.config.ballRadius),
      teams: [
        this.teams[0].players.map((player) => tracePlayer(player, this.config.playerRadius)),
        this.teams[1].players.map((player) => tracePlayer(player, this.config.playerRadius))
      ],
      score: [this.teams[0].score, this.teams[1].score],
      possession: this.possession
    };
  }

  result(): FootballMatchResult {
    const fitness: [number, number] = [0, 0];
    for (let side = 0 as 0 | 1; side <= 1; side = (side + 1) as 0 | 1) {
      const team = this.teams[side];
      fitness[side] =
        team.score * this.config.goalReward +
        team.touches * this.config.touchReward +
        team.possessionTicks * this.config.possessionReward -
        team.collisions * this.config.collisionPenalty;
    }

    return {
      winner:
        fitness[0] === fitness[1]
          ? this.teams[0].score === this.teams[1].score
            ? -1
            : this.teams[0].score > this.teams[1].score ? 0 : 1
          : fitness[0] > fitness[1] ? 0 : 1,
      score: [this.teams[0].score, this.teams[1].score],
      fitness,
      collisions: [this.teams[0].collisions, this.teams[1].collisions],
      possessionTicks: [this.teams[0].possessionTicks, this.teams[1].possessionTicks]
    };
  }
}

export function simulateFootballMatch(
  leftGenome: Float32Array,
  rightGenome: Float32Array,
  hiddenSize: number,
  userConfig: FootballTaskConfig
): FootballMatchResult {
  const runtime = new FootballMatchRuntime(leftGenome, rightGenome, hiddenSize, userConfig);
  const config = { ...defaultFootballConfig(userConfig.seed), ...userConfig };
  for (let tick = 0; tick < config.maxTicks; tick += 1) {
    runtime.tick();
  }
  return runtime.result();
}

export function runFootballTournament(
  genomes: Float32Array[],
  hiddenSize: number,
  userConfig: FootballTaskConfig
): FootballTournamentResult {
  const seedBase = userConfig.seed ?? "football";
  const scores = new Float64Array(genomes.length);
  let bracket = genomes.map((_, index) => index);
  let round = 0;
  let championIndex = bracket[0] ?? 0;
  let runnerUpIndex = bracket[0] ?? 0;
  const matches: FootballTournamentMatch[] = [];
  let preview = simulateFootballMatch(genomes[championIndex]!, genomes[runnerUpIndex]!, hiddenSize, {
    ...userConfig,
    seed: `${seedBase}:preview:initial`
  });

  while (bracket.length > 1) {
    const nextRound: number[] = [];
    for (let index = 0; index < bracket.length; index += 2) {
      const leftIndex = bracket[index]!;
      const rightIndex = bracket[index + 1];
      if (rightIndex === undefined) {
        scores[leftIndex] += 1 + round;
        matches.push({
          id: `r${round}-s${index}`,
          round,
          slot: index,
          leftIndex,
          rightIndex: null,
          winnerIndex: leftIndex,
          score: null,
          fitness: null
        });
        nextRound.push(leftIndex);
        continue;
      }
      const match = simulateFootballMatch(genomes[leftIndex]!, genomes[rightIndex]!, hiddenSize, {
        ...userConfig,
        seed: `${seedBase}:round:${round}:match:${index}:left:${leftIndex}:right:${rightIndex}`
      });
      scores[leftIndex] += match.fitness[0];
      scores[rightIndex] += match.fitness[1];
      const winner = match.winner === 1 ? rightIndex : leftIndex;
      const loser = winner === leftIndex ? rightIndex : leftIndex;
      scores[winner] += 2 + round * 1.5;
      scores[loser] -= 0.4;
      matches.push({
        id: `r${round}-s${index}`,
        round,
        slot: index,
        leftIndex,
        rightIndex,
        winnerIndex: winner,
        score: match.score,
        fitness: match.fitness
      });
      if (bracket.length <= 2) {
        championIndex = winner;
        runnerUpIndex = loser;
        preview = simulateFootballMatch(genomes[championIndex]!, genomes[runnerUpIndex]!, hiddenSize, {
          ...userConfig,
          seed: `${seedBase}:preview:final:${championIndex}:${runnerUpIndex}`
        });
      }
      nextRound.push(winner);
    }
    bracket = nextRound;
    round += 1;
  }

  championIndex = bracket[0] ?? championIndex;
  return {
    scores,
    championIndex,
    runnerUpIndex,
    preview,
    matches
  };
}
