import { makeRng } from "../rng.js";

export interface TokenSequenceSample {
  tokens: Uint16Array;
}

export interface TokenTaskDataset {
  vocab: readonly string[];
  samples: TokenSequenceSample[];
}

export interface FakeLanguageConfig {
  seed: string;
  sampleCount?: number;
}

const VOCAB = [
  "<mode-a>",
  "<mode-b>",
  "<subject-x>",
  "<subject-y>",
  "ka",
  "li",
  "zu",
  "mi",
  "ra",
  "to",
  "<sep>",
  "<eos>"
] as const;

/**
 * Synthetic language with several long-range dependencies:
 * mode chooses the repeated action token; subject chooses the reply token.
 * The model must remember both the opening mode token and the subject token
 * through the separator to predict the rest correctly.
 * Example:
 *   <mode-a> <subject-x> ka zu li ra <sep> ka zu <eos>
 *   <mode-b> <subject-y> ka mi li to <sep> ka mi <eos>
 */
export function buildFakeLanguageDataset(config: FakeLanguageConfig): TokenTaskDataset {
  const rng = makeRng(`${config.seed}:fake-language`);
  const sampleCount = config.sampleCount ?? 24;
  const samples: TokenSequenceSample[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const modeA = rng() < 0.5;
    const subjectX = rng() < 0.5;
    const mode = modeA ? 0 : 1;
    const subject = subjectX ? 2 : 3;
    const action = modeA ? 6 : 7;
    const reply = subjectX ? 8 : 9;
    samples.push({
      tokens: Uint16Array.from([mode, subject, 4, action, 5, reply, 10, 4, action, 11])
    });
  }

  return {
    vocab: VOCAB,
    samples
  };
}
