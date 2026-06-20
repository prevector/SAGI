import type { IDockviewPanelProps } from "dockview";
import { formatInt } from "../../../lib/format";
import { MockChart, NumberField, Readout } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function TrainingPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const progress = clamp(terminal.generation / Math.max(terminal.es.generations, 1), 0, 1);

  return (
    <section className={styles.panel}>
      <div className={styles.trainingHeader}>
        <div>
          <h2>{terminal.selectedGene.name}</h2>
        </div>
        <div className={styles.panelTools}>
          {terminal.status === "running" ? (
            <button onClick={terminal.pause}>PAUSE</button>
          ) : (
            <button onClick={terminal.start}>START</button>
          )}
          <button onClick={terminal.step}>STEP</button>
          <button onClick={terminal.reset}>RESET</button>
        </div>
      </div>

      <div className={styles.marketGrid}>
        <Readout label="selected loss" value={terminal.bestLoss.toFixed(4)} tone="good" />
        <Readout label="generation" value={`${formatInt(terminal.generation)} / ${formatInt(terminal.es.generations)}`} />
        <Readout label="population pairs" value={formatInt(terminal.es.populationPairs)} />
        <Readout label="sigma" value={terminal.es.sigma.toFixed(3)} />
        <Readout label="envs" value={formatInt(terminal.runConfig.environments)} />
      </div>

      <div className={styles.progressRail}>
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={styles.chartPane}>
        <MockChart history={terminal.history} />
      </div>

      <div className={styles.formGrid}>
        <NumberField
          label="generations"
          min={1}
          max={10000}
          value={terminal.es.generations}
          onChange={(value) => terminal.updateEs("generations", value)}
        />
        <NumberField
          label="population pairs"
          min={2}
          max={512}
          value={terminal.es.populationPairs}
          onChange={(value) => terminal.updateEs("populationPairs", value)}
        />
        <NumberField
          label="sigma"
          min={0.001}
          max={1}
          step={0.001}
          value={terminal.es.sigma}
          onChange={(value) => terminal.updateEs("sigma", value)}
        />
      </div>
    </section>
  );
}
