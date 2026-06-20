import styles from "./Eyebrow.module.css";

interface EyebrowProps {
  children: string;
  /** Controls the default muted text colour. */
  tone?: "dark" | "light";
  /** Show the 6px leading teal dot (DESIGN.md §5). */
  dot?: boolean;
}

/** Section kicker — Geist Mono, tracked, with an optional teal leading dot. */
export function Eyebrow({ children, tone = "dark", dot = true }: EyebrowProps) {
  return (
    <p className={[styles.eyebrow, tone === "light" ? styles.light : styles.dark].join(" ")}>
      {dot ? <span className={styles.dot} aria-hidden /> : null}
      {children}
    </p>
  );
}
