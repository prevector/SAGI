import { Bug, Cpu, Dna, GitBranch, type LucideIcon } from "lucide-react";
import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import TokenResolution from "../visuals/TokenResolution";
import { steps, type Step } from "../lib/content";
import shared from "../marketing.module.css";
import styles from "./HowItWorks.module.css";

const ICONS: Record<Step["icon"], LucideIcon> = { Dna, Bug, Cpu, GitBranch };

/** S05 — how it works. Clean white; numbered steps 1–4 + TokenResolution. */
export function HowItWorks() {
  return (
    <section id="how-it-works" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.head}>
          <Eyebrow tone="light">How it works</Eyebrow>
          <h2 className={`${shared.h2} ${styles.title}`}>A distributed search, running on everyone’s hardware.</h2>
          <p className={`${shared.bodyL} ${styles.intro}`}>
            SAGI launches with Evolvable Neural Units evolved by Evolution Strategies, a method that’s naturally
            distributable, because each machine only exchanges random seeds and a single fitness score. That makes a
            worldwide, heterogeneous network of laptops, GPUs, and cloud nodes not just possible, but efficient.
          </p>
        </Reveal>

        <ol className={styles.steps}>
          {steps.map((s, i) => {
            const Icon = ICONS[s.icon];
            return (
              <Reveal as="li" key={s.title} delay={i * 80} className={styles.step}>
                <div className={styles.stepTop}>
                  <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.stepIcon} aria-hidden>
                    <Icon size={22} strokeWidth={1.5} />
                  </span>
                </div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepBody}>{s.body}</p>
              </Reveal>
            );
          })}
        </ol>

        <Reveal className={styles.module}>
          <div className={styles.moduleHeads}>
            <span className={styles.moduleHead}>One model, scaled</span>
            <span className={styles.moduleHead}>A population, evolving</span>
          </div>
          <TokenResolution fontSize={20} />
          <p className={styles.caption}>Brute force scales one design. Evolution searches many, in parallel.</p>
        </Reveal>
      </div>
    </section>
  );
}
