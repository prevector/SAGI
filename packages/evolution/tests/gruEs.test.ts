import { describe, expect, it } from "vitest";
import { GruEsTrainingSession, GruModel, gruGenomeLength, trainGruWithEs, buildFakeLanguageDataset } from "../src/index.js";

describe("GRU genome", () => {
  it("computes a stable genome length and forward shape", () => {
    const model = new GruModel({ vocabSize: 6, hiddenSize: 5 });
    const genome = new Float32Array(gruGenomeLength({ vocabSize: 6, hiddenSize: 5 }));
    const step = model.step(genome, 2);
    expect(step.hidden.length).toBe(5);
    expect(step.logits.length).toBe(6);
    expect(Array.from(step.hidden).every(Number.isFinite)).toBe(true);
    expect(Array.from(step.logits).every(Number.isFinite)).toBe(true);
  });
});

describe("fake token language", () => {
  it("is deterministic and encodes the mode-dependent pattern", () => {
    const dataset = buildFakeLanguageDataset({ seed: "lang", sampleCount: 4 });
    const again = buildFakeLanguageDataset({ seed: "lang", sampleCount: 4 });
    expect(dataset.samples.map((sample) => Array.from(sample.tokens))).toEqual(
      again.samples.map((sample) => Array.from(sample.tokens))
    );
    for (const sample of dataset.samples) {
      expect([0, 1]).toContain(sample.tokens[0]);
      expect([2, 3]).toContain(sample.tokens[1]);
      expect(sample.tokens[2]).toBe(4);
      expect([6, 7]).toContain(sample.tokens[3]);
      expect(sample.tokens[4]).toBe(5);
      expect([8, 9]).toContain(sample.tokens[5]);
      expect(sample.tokens[6]).toBe(10);
      expect(sample.tokens[7]).toBe(4);
      expect(sample.tokens[8]).toBe(sample.tokens[3]);
      expect(sample.tokens[9]).toBe(11);
    }
  });
});

describe("GRU + evolution strategies", () => {
  it("learns next-token prediction on the fake language", () => {
    const dataset = buildFakeLanguageDataset({ seed: "train", sampleCount: 32 });
    const result = trainGruWithEs(
      dataset,
      {
        hiddenSize: 8,
        es: {
          seed: "gru-es",
          sigma: 0.08,
          learningRate: 0.06,
          populationPairs: 32,
          momentum: 0.8
        }
      },
      120
    );

    expect(result.finalLoss).toBeLessThan(result.initialLoss);
    expect(result.bestLoss).toBeLessThan(0.7);
    expect(result.bestAccuracy).toBeGreaterThan(0.8);
  });

  it("improves through the incremental training session used by the UI", () => {
    const dataset = buildFakeLanguageDataset({ seed: "ui-train", sampleCount: 32 });
    const session = new GruEsTrainingSession(
      dataset,
      {
        hiddenSize: 8,
        es: {
          seed: "ui-session",
          sigma: 0.08,
          learningRate: 0.06,
          populationPairs: 24,
          momentum: 0.8
        }
      },
      80
    );

    const initial = session.initial();
    let current = initial;
    for (let index = 0; index < 80; index += 1) {
      current = session.step();
    }

    expect(current.loss).toBeLessThan(initial.loss);
    expect(current.bestLoss).toBeLessThan(0.9);
    expect(current.bestAccuracy).toBeGreaterThan(0.68);
    expect(current.done).toBe(true);
  });
});
