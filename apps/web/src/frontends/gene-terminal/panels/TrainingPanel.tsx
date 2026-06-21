import type { IDockviewPanelProps } from "dockview";
import { formatInt } from "../../../lib/format";
import { MockChart, NumberField, Readout } from "../components";
import { FOOTBALL_TICKS_PER_SECOND, useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function TrainingPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const progress = clamp(terminal.generation / Math.max(terminal.es.generations, 1), 0, 1);
  const footballMode = terminal.trainingMode === "football";

  return (
    <section className={`${styles.panel} ${styles.panelTraining}`}>
      <div className={styles.panelTools}>
        <label className={styles.field}>
          <span>mode</span>
          <select
            value={terminal.trainingMode}
            onChange={(event) => terminal.setTrainingMode(event.target.value as typeof terminal.trainingMode)}
            className={styles.selectField}
          >
            <option value="language">fake language</option>
            <option value="football">football</option>
          </select>
        </label>
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
        <Readout
          label={footballMode ? "score" : "best loss"}
          value={footballMode ? terminal.score.toFixed(2) : terminal.bestLoss.toFixed(4)}
          tone="good"
        />
        <Readout
          label={footballMode ? "best score" : "accuracy"}
          value={footballMode ? terminal.bestScore.toFixed(2) : `${(terminal.accuracy * 100).toFixed(1)}%`}
          tone="warn"
        />
        <Readout
          label={footballMode ? "team size" : "best accuracy"}
          value={footballMode ? formatInt(terminal.footballTeamSize) : `${(terminal.bestAccuracy * 100).toFixed(1)}%`}
        />
        {footballMode ? (
          <Readout label="match seconds" value={(terminal.footballMatchTicks / FOOTBALL_TICKS_PER_SECOND).toFixed(1)} />
        ) : null}
        <Readout label="iteration" value={`${formatInt(terminal.generation)} / ${formatInt(terminal.es.generations)}`} />
        <Readout label="population pairs" value={formatInt(terminal.es.populationPairs)} />
        <Readout label="sigma" value={terminal.es.sigma.toFixed(3)} />
        <Readout label="hidden size" value={formatInt(terminal.hiddenSize)} />
      </div>

      <div className={styles.progressRail}>
        <span style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={styles.chartPane}>
        <span className={styles.sectionLabel}>{footballMode ? "tournament score over time" : "accuracy over time"}</span>
        <MockChart history={terminal.history} mode={terminal.trainingMode} />
      </div>

      <div className={styles.formGrid}>
        <NumberField
          label="brain size"
          min={2}
          max={64}
          value={terminal.hiddenSize}
          onChange={terminal.updateHiddenSize}
        />
        <NumberField
          label="iterations"
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
        <NumberField
          label="learning rate"
          min={0.001}
          max={1}
          step={0.001}
          value={terminal.es.learningRate}
          onChange={(value) => terminal.updateEs("learningRate", value)}
        />
        <NumberField
          label="momentum"
          min={0}
          max={0.999}
          step={0.001}
          value={terminal.es.momentum}
          onChange={(value) => terminal.updateEs("momentum", value)}
        />
        {footballMode ? (
          <>
            <NumberField
              label="team size"
              min={2}
              max={11}
              value={terminal.footballTeamSize}
              onChange={(value) => terminal.updateFootball("teamSize", value)}
            />
            <NumberField
              label="match seconds"
              min={2}
              max={120}
              step={0.5}
              value={terminal.footballMatchTicks / FOOTBALL_TICKS_PER_SECOND}
              onChange={(value) => terminal.updateFootball("matchSeconds", value)}
            />
            <NumberField
              label="match ticks"
              min={120}
              max={2400}
              value={terminal.footballMatchTicks}
              onChange={(value) => terminal.updateFootball("matchTicks", value)}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}
