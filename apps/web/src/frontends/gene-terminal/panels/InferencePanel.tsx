import type { IDockviewPanelProps } from "dockview";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { FootballReplayPanelBody } from "./FootballReplayPanel";
import { formatInt } from "../../../lib/format";
import { Readout } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

function tokenIcon(token: string): string {
  switch (token) {
    case "<mode-a>": return "○";
    case "<mode-b>": return "◆";
    case "<subject-x>": return "✦";
    case "<subject-y>": return "✶";
    case "<sep>": return "⟐";
    case "<eos>": return "◎";
    case "ka": return "●";
    case "mi": return "▲";
    case "li": return "■";
    case "ra": return "✚";
    default: return "•";
  }
}

function buildGaussianProbabilityPath(probabilities: ArrayLike<number>) {
  const width = 320;
  const height = 98;
  const paddingX = 12;
  const paddingY = 10;
  const count = Math.max(probabilities.length, 1);
  const sigma = 0.72;
  const samples: number = 140;
  const values = Array.from({ length: samples }, (_, sampleIndex) => {
    const t = samples === 1 ? 0 : sampleIndex / (samples - 1);
    const tokenIndex = t * Math.max(count - 1, 1);
    let weighted = 0;
    let totalWeight = 0;

    for (let index = 0; index < count; index += 1) {
      const distance = tokenIndex - index;
      const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma));
      weighted += (probabilities[index] ?? 0) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weighted / totalWeight : 0;
  });
  const maxValue = Math.max(...values, ...Array.from(probabilities), 0.001);
  const points = values.map((value, index) => {
    const t = samples === 1 ? 0 : index / (samples - 1);
    const x = paddingX + t * (width - paddingX * 2);
    const y = height - paddingY - (value / maxValue) * (height - paddingY * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const area = [
    `M ${paddingX},${height - paddingY}`,
    `L ${points[0]}`,
    ...points.slice(1).map((point) => `L ${point}`),
    `L ${width - paddingX},${height - paddingY}`,
    "Z"
  ].join(" ");

  return {
    area,
    line: `M ${points.join(" L ")}`,
    viewBox: `0 0 ${width} ${height}`
  };
}

export function InferencePanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const dataset = terminal.tokenDataset;
  const trace = terminal.inferenceTrace;
  const sample = dataset.samples[terminal.selectedSampleIndex];
  const step = trace?.steps[terminal.inferenceStepIndex] ?? null;
  const probabilityPath = step ? buildGaussianProbabilityPath(step.probabilities) : null;

  useEffect(() => {
    if (terminal.trainingMode !== "language" || !trace) return;
    const timer = window.setInterval(() => {
      if (terminal.inferenceStepIndex >= trace.steps.length - 1) {
        const nextSample = (terminal.selectedSampleIndex + 1) % Math.max(dataset.samples.length, 1);
        terminal.selectSample(nextSample);
        return;
      }
      terminal.stepInference();
    }, 180);
    return () => window.clearInterval(timer);
  }, [dataset.samples.length, terminal, trace]);

  if (terminal.trainingMode === "football") {
    return (
      <section className={`${styles.panel} ${styles.panelInference} ${styles.footballInferencePanel}`}>
        <FootballReplayPanelBody terminal={terminal} mode="inference" />
      </section>
    );
  }

  return (
    <section className={`${styles.panel} ${styles.panelInference}`}>
      <div className={styles.inferenceTaskLabel}>
        supervised learning of an artificial language (LLM)
      </div>
      <div className={styles.tokenStrip}>
        {sample ? Array.from(sample.tokens).map((token, index) => {
          const active = index === terminal.inferenceStepIndex;
          const predicted = index > 0 && step && index === terminal.inferenceStepIndex + 1;
          return (
            <span
              key={`${index}-${token}`}
              className={`${styles.tokenChip} ${active ? styles.tokenChipActive : ""} ${predicted ? styles.tokenChipPredicted : ""}`}
            >
              {tokenIcon(dataset.vocab[token] ?? "")}
            </span>
          );
        }) : null}
      </div>

      {step ? (
        <>
          <div className={styles.marketGrid}>
            <Readout label="token step" value={`${formatInt(terminal.inferenceStepIndex + 1)} / ${formatInt(trace?.steps.length ?? 0)}`} />
            <Readout label="input" value={tokenIcon(dataset.vocab[step.token] ?? "?")} />
            <Readout label="target" value={tokenIcon(dataset.vocab[step.expected] ?? "?")} />
            <Readout label="predicted" value={tokenIcon(dataset.vocab[step.predicted] ?? "?")} tone={step.predicted === step.expected ? "good" : "warn"} />
          </div>

          <div className={styles.sectionLabel}>smoothed prediction probabilities</div>
          <div className={styles.probKernel}>
            {probabilityPath ? (
              <svg viewBox={probabilityPath.viewBox} preserveAspectRatio="none" aria-hidden="true">
                <path className={styles.probKernelArea} d={probabilityPath.area} />
                <path className={styles.probKernelEchoA} d={probabilityPath.line} />
                <path className={styles.probKernelEchoB} d={probabilityPath.line} />
                <path className={styles.probKernelLine} d={probabilityPath.line} />
              </svg>
            ) : null}
            <div className={styles.probKernelTokens}>
              {Array.from(step.probabilities).map((probability, index) => (
                <div
                  key={index}
                  className={`${styles.probKernelToken} ${index === step.predicted ? styles.probKernelTokenPredicted : ""} ${index === step.expected ? styles.probKernelTokenExpected : ""}`}
                  style={{ "--probability": probability, "--token-index": index } as CSSProperties}
                  title={`${(probability * 100).toFixed(1)}%`}
                >
                  <span>{tokenIcon(dataset.vocab[index] ?? "")}</span>
                  <i />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.sectionLabel}>hidden state</div>
          <div className={styles.hiddenGrid}>
            {Array.from(step.hidden).map((value, index) => (
              <div key={index} className={styles.hiddenCell}>
                <span>h{index}</span>
                <div className={styles.hiddenBar}>
                  <i
                    style={{
                      width: `${Math.abs(value) * 100}%`,
                      background: value >= 0 ? "var(--terminal-accent-3)" : "var(--terminal-accent)"
                    }}
                  />
                </div>
                <b>{value.toFixed(2)}</b>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.note}>No trained token brain yet.</div>
      )}
    </section>
  );
}
