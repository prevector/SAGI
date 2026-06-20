import OrganismVignette from "../visuals/OrganismVignette";
import type { OrganismSpec } from "../lib/content";
import styles from "./OrganismCard.module.css";

/** S04 card: a living vignette + a mono status label + a caption. */
export function OrganismCard({ behavior, label, caption }: OrganismSpec) {
  return (
    <article className={styles.card}>
      <div className={styles.stage}>
        <OrganismVignette behavior={behavior} />
      </div>
      <span className={styles.label}>{label}</span>
      <p className={styles.caption}>{caption}</p>
    </article>
  );
}
