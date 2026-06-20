import type { IDockviewPanelProps } from "dockview";
import { summarizeCreatureGene } from "../creatureLibrary";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function CreatureLibraryPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();

  return (
    <section className={`${styles.panel} ${styles.panelLibrary}`}>
      <div className={styles.panelTools}>
        <button
          onClick={() => {
            if (window.confirm("Delete all stored creatures and reset to the seed creature?")) {
              terminal.deleteAllCreatures();
            }
          }}
        >
          DELETE ALL
        </button>
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
          );
        })}
      </div>
    </section>
  );
}
