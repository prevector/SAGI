import { PLACEHOLDER } from "../lib/content";
import styles from "./AnnouncementBar.module.css";

/** S00 — sticky announcement bar; the whole bar links to the thesis. */
export function AnnouncementBar() {
  return (
    <a className={styles.bar} href={PLACEHOLDER}>
      <span className={styles.full}>
        SAGI is live, contribute compute to the search for AGI and{" "}
        <span className={styles.earn}>earn network tokens</span>.<span className={styles.arrow}> →</span>
      </span>
      <span className={styles.short}>
        SAGI is live, <span className={styles.earn}>earn tokens</span> for the search.
        <span className={styles.arrow}> →</span>
      </span>
    </a>
  );
}
