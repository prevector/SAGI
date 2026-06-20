import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import { OrganismCard } from "../components/OrganismCard";
import { organisms } from "../lib/content";
import shared from "../marketing.module.css";
import styles from "./Organisms.module.css";

/** S04 — living candidates. Dark; intro + a row of three organism vignettes. */
export function Organisms() {
  return (
    <section className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.head}>
          <Eyebrow>Living candidates</Eyebrow>
          <h2 className={`${shared.h2} ${styles.title}`}>Every algorithm is an organism you can watch learn.</h2>
          <p className={`${shared.bodyL} ${styles.intro}`}>
            Each candidate learning system is described by a genome, its architecture, memory, plasticity, and update
            rules, and grown into a small living organism. You can watch it remember, adapt, recover from mistakes, and
            respond when the rules of its world change. An abstract learning rule becomes something you can see, cultivate,
            and care about.
          </p>
        </Reveal>
        <div className={styles.grid}>
          {organisms.map((o, i) => (
            <Reveal key={o.behavior} delay={i * 80}>
              <OrganismCard {...o} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
