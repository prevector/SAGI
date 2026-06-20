import { useMemo } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  seed: string;
  label?: string;
  size?: number;
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic identicon-ish avatar: two teal/orange-leaning hues from the seed. */
export function Avatar({ seed, label, size = 36 }: AvatarProps) {
  const { background, initials } = useMemo(() => {
    const h = hash(seed);
    // Keep hues in the teal (180) and orange (24) families for on-brand tints.
    const hueA = (h % 2 === 0 ? 180 : 24) + ((h >> 3) % 24) - 12;
    const hueB = ((h >> 7) % 2 === 0 ? 180 : 24) + ((h >> 11) % 24) - 12;
    const angle = (h >> 5) % 360;
    return {
      background: `linear-gradient(${angle}deg, hsl(${hueA} 60% 42%), hsl(${hueB} 55% 30%))`,
      initials: (seed.trim()[0] ?? "?").toUpperCase()
    };
  }, [seed]);

  return (
    <span
      className={styles.avatar}
      style={{ background, width: size, height: size, fontSize: size * 0.42 }}
      role="img"
      aria-label={label ?? `Avatar for ${seed}`}
    >
      {initials}
    </span>
  );
}
