// The R3F <Canvas> stage. Light "studio" look: a clean white background, bright
// simple lighting with soft real-time shadows, and OrbitControls — no fragile
// environment map or post-processing chain (a dark-on-dark selective-bloom
// stage made the matte geometry invisible). Owns the performance levers (capped
// DPR, demand frameloop, off-screen pause) from PLAN-3D.md §6, gated through the
// resolved QualitySettings.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { STAGE_BG, STAGE_FOG, PALETTE } from "../palette";
import { VISUAL_CONFIG, type QualitySettings } from "../config";
import type { PerfMeter } from "./usePerf";

interface StageProps {
  children: ReactNode;
  /** "always" while actively animating; "demand" when idle to save battery. */
  frameloop?: "always" | "demand";
  /** Reduced-motion / low-power: pin DPR low + no auto-rotate. */
  lowPower?: boolean;
  mobile?: boolean;
  /** Optional per-frame perf sampler (dev HUD). */
  perf?: PerfMeter;
  /** Resolved fidelity tier — drives shadows / soft shadows. */
  quality: QualitySettings;
}

/** Feeds the FPS sampler once per frame from inside the Canvas. */
function PerfSampler({ perf }: { perf: PerfMeter }) {
  useFrame(() => perf.sample());
  return null;
}

/** Applies a soft scene-level fog once the scene exists (depth on the white). */
function SceneFog() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.Fog(new THREE.Color(STAGE_FOG).getHex(), 18, 46);
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

export function Stage({
  children,
  frameloop = "demand",
  lowPower = false,
  mobile = false,
  perf,
  quality,
}: StageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  // Pause rendering when the canvas scrolls off-screen (perf budget).
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause when the tab is backgrounded.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const visible = onScreen && tabVisible;

  const dprBase = mobile ? VISUAL_CONFIG.perf.dprMobile : VISUAL_CONFIG.perf.dprDesktop;
  const dpr: [number, number] = [dprBase[0], Math.min(dprBase[1], quality.dprCap)];
  const effectiveLoop = !visible ? "demand" : frameloop;

  const shadowMap = quality.shadows ? quality.shadowMapSize : false;

  return (
    <div ref={hostRef} style={{ width: "100%", height: "100%" }}>
      <Canvas
        frameloop={effectiveLoop}
        dpr={dpr}
        shadows={shadowMap ? { type: THREE.PCFSoftShadowMap } : false}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [7, 9, 10.5], fov: 42, near: 0.1, far: 100 }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(STAGE_BG), 1)}
      >
        <SceneFog />

        {/* Bright, simple studio lighting. */}
        <ambientLight intensity={0.85} />
        <hemisphereLight args={["#ffffff", "#d4dede", 0.7]} />
        <directionalLight
          position={[7, 13, 8]}
          intensity={1.6}
          color="#ffffff"
          castShadow={!!shadowMap}
          shadow-mapSize-width={shadowMap || 1024}
          shadow-mapSize-height={shadowMap || 1024}
          shadow-camera-near={1}
          shadow-camera-far={45}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        {/* Cool fill from the opposite side so shadowed faces don't go muddy. */}
        <directionalLight position={[-8, 6, -7]} intensity={0.5} color={PALETTE.tealPale} />

        {children}

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          minDistance={6}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate={!lowPower && frameloop === "always"}
          autoRotateSpeed={0.5}
          target={[0, 0.4, 0]}
        />
        <AdaptiveDpr pixelated />
        {perf ? <PerfSampler perf={perf} /> : null}
      </Canvas>
    </div>
  );
}
