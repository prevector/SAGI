import styles from "./Skeleton.module.css";

interface SkeletonProps {
  width?: string;
  height?: string;
  radius?: string;
}

export function Skeleton({ width = "100%", height = "1rem", radius = "var(--radius)" }: SkeletonProps) {
  return <span className={styles.skeleton} style={{ width, height, borderRadius: radius }} aria-hidden />;
}

/** Convenience: a stack of skeleton lines. */
export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.lines}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height="0.9rem" width={i === count - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
