import { describe, expect, it } from "vitest";
import { FootballEsTrainingSession, FootballMatchRuntime, footballGenomeLength, footballInputLabels, randomFootballGenome, simulateFootballMatch } from "../src/index.js";

describe("football self-play task", () => {
  it("simulates a finite football match result and runtime snapshot", () => {
    const hiddenSize = 6;
    const left = randomFootballGenome(hiddenSize, "left");
    const right = randomFootballGenome(hiddenSize, "right");
    const result = simulateFootballMatch(left, right, hiddenSize, {
      seed: "match",
      maxTicks: 120,
      teamSize: 3
    });
    const runtime = new FootballMatchRuntime(left, right, hiddenSize, {
      seed: "runtime",
      maxTicks: 120,
      teamSize: 3
    });
    runtime.tick();
    const snapshot = runtime.snapshot();

    expect(snapshot.teams[0].length).toBe(3);
    expect(snapshot.teams[1].length).toBe(3);
    expect(snapshot.possession).toBe(-1);
    expect(result.fitness[0]).toBeTypeOf("number");
    expect(result.fitness[1]).toBeTypeOf("number");
    expect(footballInputLabels()).toEqual([
      "ball distance",
      "ball angle",
      "goal distance",
      "goal angle",
      "nearest teammate distance",
      "nearest teammate angle",
      "nearest opponent distance",
      "nearest opponent angle"
    ]);
  });

  it("runs tournament ES updates without losing genome shape", () => {
    const session = new FootballEsTrainingSession(
      {
        seed: "football-train",
        hiddenSize: 6,
        sigma: 0.08,
        learningRate: 0.045,
        populationPairs: 8,
        momentum: 0.7,
        football: {
          seed: "football-task",
          teamSize: 3,
          maxTicks: 160
        }
      },
      6
    );

    const initial = session.initial();
    let latest = initial;
    for (let index = 0; index < 6; index += 1) {
      latest = session.step();
    }

    expect(initial.genome.length).toBe(footballGenomeLength(6));
    expect(latest.genome.length).toBe(footballGenomeLength(6));
    expect(Number.isFinite(latest.score)).toBe(true);
    expect(Number.isFinite(latest.bestScore)).toBe(true);
    expect(latest.preview.score.length).toBe(2);
  });

  it("keeps football trainer score bookkeeping consistent after completion", () => {
    const session = new FootballEsTrainingSession(
      {
        seed: "football-train-done",
        hiddenSize: 6,
        sigma: 0.08,
        learningRate: 0.045,
        populationPairs: 4,
        momentum: 0.7,
        football: {
          seed: "football-task-done",
          teamSize: 3,
          maxTicks: 120
        }
      },
      2
    );

    session.step();
    const finalStep = session.step();
    const doneStep = session.step();

    expect(finalStep.done).toBe(true);
    expect(doneStep.done).toBe(true);
    expect(doneStep.score).toBe(doneStep.bestScore);
    expect(doneStep.preview.score.length).toBe(2);
  });

  it("awards goals and resets formation while keeping the running score", () => {
    const hiddenSize = 6;
    const left = randomFootballGenome(hiddenSize, "goal-left");
    const right = randomFootballGenome(hiddenSize, "goal-right");
    const runtime = new FootballMatchRuntime(left, right, hiddenSize, {
      seed: "goal-reset",
      maxTicks: 120,
      teamSize: 3
    });

    const internal = runtime as unknown as {
      ball: { x: number; y: number; vx: number; vy: number };
      config: { fieldWidth: number; fieldHeight: number };
      teams: Array<{ score: number }>;
    };
    internal.ball.x = internal.config.fieldWidth + 0.1;
    internal.ball.y = internal.config.fieldHeight / 2;
    internal.ball.vx = 0;
    internal.ball.vy = 0;

    runtime.tick();

    const snapshot = runtime.snapshot();
    const result = runtime.result();
    expect(snapshot.score).toEqual([1, 0]);
    expect(result.score).toEqual([1, 0]);
    expect(snapshot.ball.x).toBeCloseTo(internal.config.fieldWidth / 2, 1);
    expect(snapshot.teams[0][0]?.x).toBeLessThan(internal.config.fieldWidth / 2);
    expect(snapshot.teams[1][0]?.x).toBeGreaterThan(internal.config.fieldWidth / 2);

    runtime.restart("goal-reset:next");
    const restarted = runtime.snapshot();
    expect(restarted.score).toEqual([0, 0]);
    expect(restarted.tick).toBe(0);
  });
});
