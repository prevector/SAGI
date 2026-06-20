import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "section" | "div";
  /** Muted styling for historic/closed content. */
  muted?: boolean;
  children: ReactNode;
}

export function Card({ as = "article", muted = false, className, children, ...rest }: CardProps) {
  const Tag = as;
  return (
    <Tag className={[styles.card, muted ? styles.muted : "", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </Tag>
  );
}
