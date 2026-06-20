import styles from "./LivePulse.module.css";

/** Live indicator: animated dot + "LIVE" text (text carries the meaning). */
export function LivePulse() {
  return (
    <span className={styles.live}>
      <span className={styles.dot} aria-hidden />
      Live
    </span>
  );
}
