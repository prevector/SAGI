import { useEffect, useState } from "react";
import type { IDockviewPanelProps } from "dockview";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function CreatureLibraryPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const creature = terminal.selectedCreature;
  const [nameDraft, setNameDraft] = useState(creature.name);

  useEffect(() => {
    setNameDraft(creature.name);
  }, [creature.id, creature.name]);

  function commitName() {
    terminal.renameCreature(nameDraft);
  }

  return (
    <section className={`${styles.panel} ${styles.panelLibrary}`}>
      <div className={styles.libraryHeader}>
        <label className={styles.field}>
          <span>name</span>
          <input
            type="text"
            maxLength={24}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
            }}
          />
        </label>
        <div className={styles.panelTools}>
          <button onClick={terminal.generateCreature}>NEW CREATURE</button>
          <button onClick={terminal.saveCreature}>SAVE</button>
        </div>
      </div>

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

      <div className={styles.geneList}>
        {terminal.creatures.map((item) => (
          <button
            key={item.id}
            className={item.id === terminal.selectedId ? styles.selectedGene : ""}
            onClick={() => terminal.selectGene(item.id)}
          >
            <span className={styles.creatureListTitle}>
              {item.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
