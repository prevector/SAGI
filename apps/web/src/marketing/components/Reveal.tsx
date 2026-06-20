import { createElement, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useReveal } from "../lib/useReveal";
import shared from "../marketing.module.css";

interface RevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Stagger offset in ms (DESIGN.md §6 `stagger` = 80ms increments). */
  delay?: number;
  /** Element to render (e.g. "li" inside a list). Defaults to a div. */
  as?: ElementType;
}

/** Wraps content in the `diffuse-in` scroll reveal. */
export function Reveal({ children, className, style, delay = 0, as }: RevealProps) {
  const { ref, shown } = useReveal<HTMLElement>();
  // Polymorphic tag (div by default, e.g. "li" inside a list). createElement
  // sidesteps the ElementType union collapsing every JSX prop to `never`.
  return createElement(
    (as ?? "div") as ElementType,
    {
      ref,
      className: [shared.reveal, shown ? shared.revealIn : "", className].filter(Boolean).join(" "),
      style: delay ? { ...style, transitionDelay: `${delay}ms` } : style,
    },
    children
  );
}
