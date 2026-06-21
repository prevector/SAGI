export interface ControlGruShape {
  inputSize: number;
  hiddenSize: number;
  outputSize: number;
}

export interface ControlGruStepResult {
  hidden: Float32Array;
  output: Float32Array;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function controlGruGenomeLength(shape: ControlGruShape): number {
  const { inputSize, hiddenSize, outputSize } = shape;
  const gate = hiddenSize * inputSize + hiddenSize * hiddenSize + hiddenSize;
  const output = outputSize * hiddenSize + outputSize;
  return gate * 3 + output;
}

export class ControlGruModel {
  readonly shape: ControlGruShape;

  constructor(shape: ControlGruShape) {
    this.shape = shape;
  }

  step(genome: Float32Array, input: ArrayLike<number>, prevHidden?: Float32Array): ControlGruStepResult {
    const { inputSize, hiddenSize, outputSize } = this.shape;
    const hidden = prevHidden ? prevHidden.slice() : new Float32Array(hiddenSize);
    const nextHidden = new Float32Array(hiddenSize);
    const z = new Float32Array(hiddenSize);
    const r = new Float32Array(hiddenSize);
    const hHat = new Float32Array(hiddenSize);
    const output = new Float32Array(outputSize);

    const wzStart = 0;
    const uzStart = wzStart + hiddenSize * inputSize;
    const bzStart = uzStart + hiddenSize * hiddenSize;
    const wrStart = bzStart + hiddenSize;
    const urStart = wrStart + hiddenSize * inputSize;
    const brStart = urStart + hiddenSize * hiddenSize;
    const whStart = brStart + hiddenSize;
    const uhStart = whStart + hiddenSize * inputSize;
    const bhStart = uhStart + hiddenSize * hiddenSize;
    const woStart = bhStart + hiddenSize;
    const boStart = woStart + outputSize * hiddenSize;

    for (let row = 0; row < hiddenSize; row += 1) {
      let zSum = genome[bzStart + row] ?? 0;
      let rSum = genome[brStart + row] ?? 0;
      const wzBase = wzStart + row * inputSize;
      const wrBase = wrStart + row * inputSize;
      const uzBase = uzStart + row * hiddenSize;
      const urBase = urStart + row * hiddenSize;
      for (let col = 0; col < inputSize; col += 1) {
        const value = input[col] ?? 0;
        zSum += (genome[wzBase + col] ?? 0) * value;
        rSum += (genome[wrBase + col] ?? 0) * value;
      }
      for (let col = 0; col < hiddenSize; col += 1) {
        zSum += (genome[uzBase + col] ?? 0) * hidden[col];
        rSum += (genome[urBase + col] ?? 0) * hidden[col];
      }
      z[row] = sigmoid(zSum);
      r[row] = sigmoid(rSum);
    }

    for (let row = 0; row < hiddenSize; row += 1) {
      let hSum = genome[bhStart + row] ?? 0;
      const whBase = whStart + row * inputSize;
      const uhBase = uhStart + row * hiddenSize;
      for (let col = 0; col < inputSize; col += 1) {
        hSum += (genome[whBase + col] ?? 0) * (input[col] ?? 0);
      }
      for (let col = 0; col < hiddenSize; col += 1) {
        hSum += (genome[uhBase + col] ?? 0) * (r[col] * hidden[col]);
      }
      hHat[row] = Math.tanh(hSum);
      nextHidden[row] = (1 - z[row]) * hidden[row] + z[row] * hHat[row];
    }

    for (let row = 0; row < outputSize; row += 1) {
      let sum = genome[boStart + row] ?? 0;
      const base = woStart + row * hiddenSize;
      for (let col = 0; col < hiddenSize; col += 1) {
        sum += (genome[base + col] ?? 0) * nextHidden[col];
      }
      output[row] = Math.tanh(sum);
    }

    return {
      hidden: nextHidden,
      output
    };
  }
}
