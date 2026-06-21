import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useInView } from "../lib/useInView";
import { useNetworkStats } from "../network/useNetworkStats";
import { Eyebrow } from "../components/Eyebrow";
import { CtaLink } from "../components/CtaLink";
import { APP_LOGIN } from "../lib/content";
import styles from "./SagiNetwork.module.css";

// The 3D swarm pulls in three.js + R3F + postprocessing — code-split and only
// mounted once the section scrolls into view, so it never weighs on first paint.
const Swarm = lazy(() => import("../network/Swarm").then((m) => ({ default: m.Swarm })));

// Where "see an app built on the SDK" points — the contribute game (SDK/game).
// Deployed as a single container (game + mock) on Coolify; this is its live URL.
// Overridable via VITE_CONTRIBUTE_URL (e.g. a custom subdomain later); in local
// dev we point at the Vite server on :5174.
const DEMO_URL = "http://atp11vptb2aypnzww94nbxrk.46.225.61.42.sslip.io";
const CONTRIBUTE_URL =
  import.meta.env.VITE_CONTRIBUTE_URL ?? (import.meta.env.DEV ? "http://localhost:5174" : DEMO_URL);

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** S05.5 — the live SAGI network swarm, embedded in the homepage scroll. */
export function SagiNetwork() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.15 });
  const seen = useInView(ref, { once: true, amount: 0 });
  const reduced = usePrefersReducedMotion();
  const active = inView && !reduced;

  const { nodes, stats, pulsingIds, humanPulseIds, humanBurst, live } = useNetworkStats(active);
  const deviceCount = nodes.filter((n) => n.id !== "core").length;
  const humanSignals = stats.human_signals ?? 0;

  // Pop the HUMAN SIGNALS counter + show a toast on each distinct human burst.
  const [pop, setPop] = useState(false);
  const [toast, setToast] = useState<{ tokens: number } | null>(null);
  useEffect(() => {
    if (!humanBurst) return;
    setPop(true);
    setToast({ tokens: humanBurst.tokens });
    const p = setTimeout(() => setPop(false), 200);
    const t = setTimeout(() => setToast(null), 3200);
    return () => { clearTimeout(p); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humanBurst?.id]);

  return (
    <section id="sagi-network" ref={ref} className={styles.section}>
      <div className={styles.band}>
        <div className={styles.canvasWrap}>
          {seen ? (
            <Suspense fallback={<div className={styles.canvasFallback} aria-hidden />}>
              <Swarm
                nodes={nodes}
                pulsingIds={pulsingIds}
                humanPulseIds={humanPulseIds}
                active={active}
                style={{ width: "100%", height: "100%" }}
              />
            </Suspense>
          ) : (
            <div className={styles.canvasFallback} aria-hidden />
          )}
        </div>

        <div className={styles.topBar}>
          <span className={styles.chip}>
            <span className={`${styles.dot} ${live ? "" : styles.dotSim}`} />
            {live ? "Live network" : "Network preview"}
          </span>
        </div>

        <div className={styles.center}>
          <Eyebrow>SAGI network</Eyebrow>
          <h2 className={styles.title}>The swarm, alive.</h2>
          <p className={styles.sub}>
            Every device and every app contributing compute and human judgment shows up here —
            and a human signal lights it up.
          </p>
        </div>

        {toast ? (
          <div className={styles.toast} role="status">
            ⚡ Human signal{toast.tokens > 0 ? <> · <strong>+{toast.tokens} tokens</strong></> : null}
          </div>
        ) : null}

        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statValue}>{deviceCount.toLocaleString()}</div>
            <div className={styles.statLabel}>devices in swarm</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statValue}>{stats.votes.toLocaleString()}</div>
            <div className={styles.statLabel}>signals contributed</div>
          </div>
          <div className={`${styles.stat} ${styles.human}`}>
            <div className={`${styles.humanValue} ${pop ? styles.humanPop : ""}`}>
              {humanSignals.toLocaleString()}
            </div>
            <div className={styles.humanLabel}>human signals</div>
          </div>
          <div className={styles.stat}>
            <div className={`${styles.statValue} ${styles.statTokens}`}>
              {stats.tokens_awarded.toLocaleString()}
            </div>
            <div className={styles.statLabel}>tokens awarded</div>
          </div>
        </div>
      </div>

      <div className={styles.pitch}>
        <h3 className={styles.pitchTitle}>Any app can feed the swarm.</h3>
        <p className={styles.pitchBody}>
          The SAGI SDK lets developers plug any app into the network — contributing the human
          judgment, spare compute, or proprietary signal the network can&apos;t cheaply produce on
          its own. From a consumer app to a business&apos;s idle infrastructure, every contribution
          earns tokens and ripples through the swarm above in real time.
        </p>
        <div className={styles.ctaRow}>
          <CtaLink to="/docs" variant="ghost">Check the documentation</CtaLink>
          {CONTRIBUTE_URL ? (
            <>
              <CtaLink href={CONTRIBUTE_URL} variant="primary">See an app built on the SDK →</CtaLink>
              <span className={styles.note}>a live example contributing to the swarm</span>
            </>
          ) : (
            <>
              <CtaLink href={APP_LOGIN} variant="primary">Join the network →</CtaLink>
              <span className={styles.note}>contribute compute and judgment, earn tokens</span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
