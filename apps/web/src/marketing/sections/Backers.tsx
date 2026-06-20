import { LogoTicker } from "../components/LogoTicker";
import { Reveal } from "../components/Reveal";
import { sponsors } from "../lib/content";
import shared from "../marketing.module.css";
import styles from "./Backers.module.css";

/** S08 — backers. Deep-black band with a marquee of fictional sponsor marks. */
export function Backers() {
  return (
    <section id="backers" className={styles.section}>
      <div className={shared.container}>
        <Reveal>
          <p className={styles.label}>Backed by the labs pushing the frontier</p>
        </Reveal>
      </div>
      <LogoTicker items={sponsors} />
    </section>
  );
}
