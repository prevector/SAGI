import type { IDockviewPanelProps } from "dockview";
import { FootballReplayPanelBody } from "./FootballReplayPanel";
import { formatInt } from "../../../lib/format";
import { Readout } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function InferencePanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  if (terminal.trainingMode === "football") {
    return (
      <section className={`${styles.panel} ${styles.panelInference}`}>
        <div className={styles.trainingHeader}>
          <div>
            <h2>Football inference</h2>
            <span className={styles.sectionLabel}>current best brain playing on the field</span>
          </div>
        </div>
        <FootballReplayPanelBody terminal={terminal} mode="inference" />
      </section>
    );
  }

  const dataset = terminal.tokenDataset;
  const trace = terminal.inferenceTrace;
  const sample = dataset.samples[terminal.selectedSampleIndex];
  const step = trace?.steps[terminal.inferenceStepIndex] ?? null;

  return (
    <section className={`${styles.panel} ${styles.panelInference}`}>
      <div className={styles.trainingHeader}>
        <div>
          <h2>Sequence inspector</h2>
          <span className={styles.sectionLabel}>step through one fake-language sample</span>
        </div>
        <div className={styles.panelTools}>
          <button onClick={terminal.resetInference}>RESET STEP</button>
          <button onClick={terminal.stepInference}>NEXT TOKEN</button>
        </div>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>sample</span>
          <select
            value={terminal.selectedSampleIndex}
            onChange={(event) => terminal.selectSample(Number(event.target.value))}
            className={styles.selectField}
          >
            {dataset.samples.map((_, index) => (
              <option key={index} value={index}>
                sample {index + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.sectionLabel}>language sample</div>
      <div className={styles.tokenStrip}>
        {sample ? Array.from(sample.tokens).map((token, index) => {
          const active = index === terminal.inferenceStepIndex;
          const predicted = index > 0 && step && index === terminal.inferenceStepIndex + 1;
          return (
            <span
              key={`${index}-${token}`}
              className={`${styles.tokenChip} ${active ? styles.tokenChipActive : ""} ${predicted ? styles.tokenChipPredicted : ""}`}
            >
              {dataset.vocab[token]}
            </span>
          );
        }) : null}
      </div>

      {step ? (
        <>
          <div className={styles.marketGrid}>
            <Readout label="token step" value={`${formatInt(terminal.inferenceStepIndex + 1)} / ${formatInt(trace?.steps.length ?? 0)}`} />
            <Readout label="input token" value={dataset.vocab[step.token] ?? "?"} />
            <Readout label="target next" value={dataset.vocab[step.expected] ?? "?"} />
            <Readout label="predicted" value={dataset.vocab[step.predicted] ?? "?"} tone={step.predicted === step.expected ? "good" : "warn"} />
          </div>

          <div className={styles.sectionLabel}>prediction probabilities</div>
          <div className={styles.probList}>
            {Array.from(step.probabilities).map((probability, index) => (
              <div key={index} className={styles.probRow}>
                <span>{dataset.vocab[index]}</span>
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
        <div className={styles.note}>Train the current creature first, then step through one sequence here.</div>
      )}
    </section>
  );
}
