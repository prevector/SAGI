import { footerColumns, footerDisclaimer } from "../lib/content";
import { SagiLogo } from "../components/SagiLogo";
import shared from "../marketing.module.css";
import styles from "./LandingFooter.module.css";

/** S10 — footer. Deep-black; wordmark, link columns, disclaimer, © line. */
export function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={shared.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <SagiLogo height={24} className={styles.wordmark} />
            <p className={styles.tagline}>A distributed search for artificial general intelligence.</p>
          </div>
          <div className={styles.columns}>
            {footerColumns.map((col) => (
              <nav className={styles.column} key={col.title} aria-label={col.title}>
                <p className={styles.colTitle}>{col.title}</p>
                {col.links.map((l) => (
                  <a key={l.label} href={l.href} className={styles.colLink}>
                    {l.label}
                  </a>
                ))}
              </nav>
            ))}
          </div>
        </div>
        <p className={styles.disclaimer}>{footerDisclaimer}</p>
        <p className={styles.copyright}>© 2026 SAGI</p>
      </div>
    </footer>
  );
}
