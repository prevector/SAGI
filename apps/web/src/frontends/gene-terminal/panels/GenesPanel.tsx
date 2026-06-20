import type { IDockviewPanelProps } from "dockview";
import { formatInt } from "../../../lib/format";
import { summarizeCreatureGene } from "../creatureLibrary";
import { useGeneTerminal } from "../state";
import { NumberField, Readout, shortId } from "../components";
import styles from "../GeneTerminal.module.css";

export function GenesPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const creature = terminal.selectedCreature;
  const gene = creature.gene;
  const summary = summarizeCreatureGene(gene);

  return (
    <section className={`${styles.panel} ${styles.panelGenes}`}>
      <div className={styles.panelTools}>
        <button onClick={terminal.generateCreature}>NEW CREATURE</button>
        <button onClick={terminal.mutateGene}>MUTATE</button>
        <button onClick={terminal.saveCreature}>SAVE</button>
        <button onClick={terminal.createGene}>NEW GENE</button>
      </div>

      <div className={styles.sectionLabel}>current creature</div>
      <div className={styles.creatureEditor}>
        <label className={styles.field}>
          <span>name</span>
          <input
            type="text"
            maxLength={24}
            value={creature.name}
            onChange={(event) => terminal.renameCreature(event.target.value)}
          />
        </label>
        <div className={styles.paletteCard}>
          <div
            className={styles.paletteSwatch}
            style={{
              background: `linear-gradient(135deg, ${creature.phenotype.bodyFrom}, ${creature.phenotype.bodyTo})`
            }}
          />
          <div className={styles.paletteMeta}>
            <strong>{creature.phenotype.paletteName}</strong>
            <span>
              {Math.round(creature.phenotype.hueFrom)}° to {Math.round(creature.phenotype.hueTo)}°
            </span>
          </div>
        </div>
      </div>

      <div className={styles.sectionLabel}>creature library</div>
      <div className={styles.geneList}>
        {terminal.creatures.map((item) => {
          const itemSummary = summarizeCreatureGene(item.gene);
          return (
          <button
            key={item.id}
            className={item.id === terminal.selectedId ? styles.selectedGene : ""}
            onClick={() => terminal.selectGene(item.id)}
          >
            <span className={styles.creatureListTitle}>
              <i
                className={styles.creatureDot}
                style={{
                  background: `linear-gradient(135deg, ${item.phenotype.bodyFrom}, ${item.phenotype.bodyTo})`
                }}
              />
              {item.name}
            </span>
            <small>
              {itemSummary.legPairs * 2} legs · {itemSummary.archetype} · {item.phenotype.paletteName}
            </small>
          </button>
        );})}
      </div>

      <div className={styles.sectionLabel}>current parameters</div>
      <div className={styles.matrix}>
        <Readout label="creature id" value={shortId(creature.id)} />
        <Readout label="schema" value={`v${gene.schemaVersion}`} />
        <Readout label="weights" value={formatInt(terminal.weightCount)} />
        <Readout label="legs" value={formatInt(summary.legPairs * 2)} />
        <Readout label="spine" value={formatInt(summary.spineSegments)} />
        <Readout label="arms" value={formatInt(summary.armPairs * 2)} />
        <Readout label="states" value={`${formatInt(gene.architecture.neuronStateSize)} / ${formatInt(gene.architecture.synapseStateSize)}`} />
      </div>

      <div className={styles.formGrid}>
        <NumberField
          label="neuron states"
          min={1}
          max={64}
          value={gene.architecture.neuronStateSize}
          onChange={(value) => terminal.updateArchitecture("neuronStateSize", value)}
        />
        <NumberField
          label="synapse states"
          min={0}
          max={64}
          value={gene.architecture.synapseStateSize}
          onChange={(value) => terminal.updateArchitecture("synapseStateSize", value)}
        />
        <NumberField
          label="output gain"
          min={0.1}
          max={2000}
          step={0.1}
          value={gene.architecture.outputGain}
          onChange={(value) => terminal.updateArchitecture("outputGain", value)}
        />
      </div>
      <div className={styles.note}>
        {summary.archetype} body, {creature.phenotype.paletteName.toLowerCase()} palette, {shortId(gene.id)} gene backing this creature.
      </div>
    </section>
  );
}
