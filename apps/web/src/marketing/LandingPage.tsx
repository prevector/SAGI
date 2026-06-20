import { useEffect } from "react";
import { AnnouncementBar } from "./sections/AnnouncementBar";
import { LandingNav } from "./sections/LandingNav";
import { Hero } from "./sections/Hero";
import { Premise } from "./sections/Premise";
import { Organisms } from "./sections/Organisms";
import { HowItWorks } from "./sections/HowItWorks";
import { TokenEconomy } from "./sections/TokenEconomy";
import { Bounties } from "./sections/Bounties";
import { Backers } from "./sections/Backers";
import { FinalCta } from "./sections/FinalCta";
import { LandingFooter } from "./sections/LandingFooter";
import styles from "./marketing.module.css";

/**
 * SAGI marketing landing page — a native React recreation of the Framer site
 * (S00–S10). Mounted at the public root "/"; the terminal workspace lives under /app.
 */
export default function LandingPage() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "SAGI — A distributed search for AGI";
    // Smooth-scroll for in-page anchor nav (reduced-motion is forced to auto by
    // the global rule in globals.css).
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => {
      document.title = prevTitle;
      root.style.scrollBehavior = prevBehavior;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AnnouncementBar />
        <LandingNav />
      </header>
      <main>
        <Hero />
        <Premise />
        <Organisms />
        <HowItWorks />
        <TokenEconomy />
        <Bounties />
        <Backers />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
