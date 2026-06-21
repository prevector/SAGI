import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

// Wraps the app in an iPhone mockup when it's viewed standalone on a wide screen
// (e.g. a laptop during a demo). It deliberately stays fullscreen when:
//  - the viewport is narrow / a real phone (no point framing a phone with a phone), or
//  - the app is inside an iframe — the website's DemoPage already renders it inside a
//    phone bezel, so framing again would nest two phones.
// The app root is `position: absolute; inset: 0`, so it fills whichever positioned
// container we hand it: a fixed full-viewport box (fullscreen) or the phone screen.

const INK = "#2E2118";

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin access throws — that only happens when we're embedded.
    return true;
  }
}

function useWideScreen(): boolean {
  const query = "(min-width: 760px) and (min-height: 600px)";
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setWide(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return wide;
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  const wide = useWideScreen();
  const framed = wide && !inIframe();

  if (!framed) {
    // Fullscreen: a fixed full-viewport positioned container for the absolute app.
    return <div style={styles.fullscreen}>{children}</div>;
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.phone}>
        <div style={styles.screen}>
          {/* Dynamic island */}
          <div style={styles.island} />
          {/* Faux iOS status bar so the chrome reads as a real phone */}
          <div style={styles.statusBar}>
            <span style={styles.time}>9:41</span>
            <span style={styles.statusIcons}>
              <Signal />
              <Wifi />
              <Battery />
            </span>
          </div>
          {/* The app fills the area below the status bar. */}
          <div style={styles.appArea}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function Signal() {
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5, height: 11 }}>
      {[4, 6, 8, 11].map((h) => (
        <span key={h} style={{ width: 3, height: h, borderRadius: 1, background: INK }} />
      ))}
    </span>
  );
}

function Wifi() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden>
      <path d="M8 10.2a1.3 1.3 0 100-2.6 1.3 1.3 0 000 2.6Z" fill={INK} />
      <path d="M3.2 5.4a7 7 0 019.6 0M5.1 7.3a4.3 4.3 0 015.8 0" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function Battery() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 1.5 }}>
      <span style={{ width: 22, height: 11, borderRadius: 3, border: `1px solid ${INK}`, padding: 1.5, display: "inline-flex" }}>
        <span style={{ flex: 1, background: INK, borderRadius: 1 }} />
      </span>
      <span style={{ width: 1.5, height: 4, borderRadius: 1, background: INK }} />
    </span>
  );
}

const STATUS_BAR_HEIGHT = 46;

const styles: Record<string, CSSProperties> = {
  fullscreen: { position: "fixed", inset: 0 },
  backdrop: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at 50% 28%, #efe9df 0%, #e3dccd 60%, #d9d1c0 100%)",
    overflow: "hidden",
  },
  phone: {
    position: "relative",
    width: 392,
    maxWidth: "94vw",
    height: "min(848px, 94vh)",
    background: "linear-gradient(150deg, #2b2b2e, #141416)",
    borderRadius: 56,
    padding: 13,
    boxShadow:
      "0 50px 120px rgba(40,33,24,0.45), 0 8px 28px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.06)",
  },
  screen: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: 44,
    overflow: "hidden",
    background: "#F5F0EA",
    display: "flex",
    flexDirection: "column",
  },
  island: {
    position: "absolute",
    top: 11,
    left: "50%",
    transform: "translateX(-50%)",
    width: 108,
    height: 30,
    background: "#000",
    borderRadius: 999,
    zIndex: 5,
  },
  statusBar: {
    flex: `0 0 ${STATUS_BAR_HEIGHT}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 26px",
    paddingTop: 6,
  },
  time: { fontFamily: '"Gothic A1", system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: INK, letterSpacing: "0.02em" },
  statusIcons: { display: "inline-flex", alignItems: "center", gap: 6 },
  // The app is `position: absolute; inset: 0`, so it needs a positioned, sized parent.
  appArea: { position: "relative", flex: 1, minHeight: 0 },
};
