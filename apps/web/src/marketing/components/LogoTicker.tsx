import styles from "./LogoTicker.module.css";

/** S08 marquee of monochrome sponsor wordmarks (pause on hover; static under reduced motion). */
export function LogoTicker({ items }: { items: string[] }) {
  // Duplicate the set so the -50% translate loop is seamless.
  const loop = [...items, ...items];
  return (
    <div className={styles.viewport} aria-label="Backers">
      <div className={styles.track}>
        {loop.map((name, i) => (
          <span className={styles.mark} key={`${name}-${i}`} aria-hidden={i >= items.length}>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
