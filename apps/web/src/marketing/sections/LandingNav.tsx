import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { APP_LOGIN, navLinks, PLACEHOLDER } from "../lib/content";
import { CtaLink } from "../components/CtaLink";
import { SagiLogo } from "../components/SagiLogo";
import styles from "./LandingNav.module.css";

/** S01 — sticky nav; transparent over the hero, gains a dark fill on scroll. */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={[styles.nav, scrolled ? styles.scrolled : ""].join(" ")} aria-label="Primary">
      <div className={styles.inner}>
        <a href="#top" className={styles.wordmark} onClick={() => setOpen(false)}>
          <SagiLogo height={28} />
        </a>

        <div className={styles.links}>
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className={styles.link}>
              {l.label}
            </a>
          ))}
        </div>

        <div className={styles.cluster}>
          <CtaLink href={PLACEHOLDER} variant="ghost" className={styles.thesis}>
            Read the thesis
          </CtaLink>
          <CtaLink to={APP_LOGIN} variant="primary">
            Join the network
          </CtaLink>
          <button
            type="button"
            className={styles.hamburger}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className={styles.drawer}>
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className={styles.drawerLink} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <a href={PLACEHOLDER} className={styles.drawerLink} onClick={() => setOpen(false)}>
            Read the thesis
          </a>
        </div>
      ) : null}
    </nav>
  );
}
