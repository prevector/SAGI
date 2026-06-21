import type { IDockviewPanelProps } from "dockview";
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

export function InferencePanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const dataset = terminal.tokenDataset;
  const trace = terminal.inferenceTrace;
  const sample = dataset.samples[terminal.selectedSampleIndex];
  const step = trace?.steps[terminal.inferenceStepIndex] ?? null;

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

          <div className={styles.sectionLabel}>prediction probabilities</div>
          <div className={styles.probList}>
            {Array.from(step.probabilities).map((probability, index) => (
              <div key={index} className={styles.probRow}>
                <span>{tokenIcon(dataset.vocab[index] ?? "")}</span>
                <div className={styles.probBar}>
                  <i style={{ width: `${probability * 100}%` }} />
                </div>
                <b>{(probability * 100).toFixed(1)}%</b>
              </div>
            ))}
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
