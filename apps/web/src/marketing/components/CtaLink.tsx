import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import btn from "./CtaLink.module.css";

type Variant = "primary" | "reward" | "ghost";
type Size = "sm" | "md";

interface CtaLinkProps {
  children: ReactNode;
  /** Internal route (react-router). Takes precedence over `href`. */
  to?: string;
  /** External / placeholder href. */
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}

/**
 * A call-to-action rendered with the shared Button styling but with proper link
 * semantics (router Link for internal routes, <a> otherwise).
 */
export function CtaLink({ children, to, href = "#", variant = "primary", size = "md", className }: CtaLinkProps) {
  const cls = [btn.button, btn[variant], btn[size], className].filter(Boolean).join(" ");
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}
