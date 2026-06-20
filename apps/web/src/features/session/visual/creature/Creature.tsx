// Renders an assembled CreatureRig and animates it imperatively (refs +
// useFrame) so the single "champion" stays at 60fps with no per-frame React
// re-render. Beyond the leg IK gait it now layers the secondary motion that
// sells a *living* organism: breathing, a flexing/swaying spine, a nodding head
// with periodic blinks, a spring-trailing tail, knee knuckles, dorsal spines,
// and a fitness-driven emissive energy wave that travels head→tail (the
// creature visibly "thinks harder" as it learns). Geometry density, material
// richness and the finer details all scale with the QualitySettings tier.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { QualitySettings } from "../config";

import { createCreatureMaterials } from "./materials";
import type { CreatureRig, Vec3 } from "./assemble";
import { solveIK2Bone } from "./assemble";
import { STEP, bodyBob, footCycleOffset, gaitFor, type LegCount } from "./gaits";

const UP = new THREE.Vector3(0, 1, 0);
// Scratch objects reused across frames (one champion creature → safe).
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _q = new THREE.Quaternion();

/** Orient a unit-height cylinder mesh to span from -> to. */
function orientBone(mesh: THREE.Object3D, from: Vec3, to: Vec3): void {
  _a.set(from[0], from[1], from[2]);
  _b.set(to[0], to[1], to[2]);
  _dir.subVectors(_b, _a);
  const length = Math.max(_dir.length(), 1e-3);
  _mid.addVectors(_a, _b).multiplyScalar(0.5);
  mesh.position.copy(_mid);
  _q.setFromUnitVectors(UP, _dir.normalize());
  mesh.quaternion.copy(_q);
  mesh.scale.set(1, length, 1);
}

interface CreatureProps {
  rig: CreatureRig;
  /** Animate the gait. When false, a calm idle (breathing only) is held. */
  walk?: boolean;
  /** Walk speed multiplier (drives step frequency). */
  speed?: number;
  quality: QualitySettings;
  /** 0..1 — GA progress; drives the emissive "thinking" energy. */
  fitness?: number;
}

export function Creature({ rig, walk = false, speed = 1, quality, fitness = 0.3 }: CreatureProps) {
  const { surface } = rig.genome;
  const legCount = rig.legs.length as LegCount;
  const gait = useMemo(() => gaitFor(legCount), [legCount]);

  const limbRadius = rig.bodyRadius * 0.22;
  const bobAmp = rig.standHeight * 0.06;
  const stride = STEP.stride * rig.scale;
  const lift = STEP.lift * rig.scale;
  const swayAmp = rig.bodyRadius * 0.18;

  /* materials (per-segment body so the energy wave can travel) */
  const mats = useMemo(
    () => createCreatureMaterials(rig.color, surface, rig.segments.length, quality),
    [rig.color, surface, rig.segments.length, quality]
  );
  useEffect(() => () => mats.dispose(), [mats]);

  /* geometry — density scales with tier */
  const seg = quality.bodySegments;
  const limbRad = quality.limbRadial;
  const upperGeo = useMemo(
    () => new THREE.CylinderGeometry(limbRadius, limbRadius * 0.85, 1, limbRad),
    [limbRadius, limbRad]
  );
  const lowerGeo = useMemo(
    () => new THREE.CylinderGeometry(limbRadius * 0.85, limbRadius * 0.7, 1, limbRad),
    [limbRadius, limbRad]
  );
  const kneeGeo = useMemo(
    () => new THREE.SphereGeometry(limbRadius * 0.95, Math.max(8, limbRad), Math.max(6, limbRad / 2)),
    [limbRadius, limbRad]
  );
  useEffect(
    () => () => {
      upperGeo.dispose();
      lowerGeo.dispose();
      kneeGeo.dispose();
    },
    [upperGeo, lowerGeo, kneeGeo]
  );

  /* dorsal spines (fine detail; skipped on low tier) */
  const spines = useMemo(() => {
    if (quality.tier === "low") return [];
    const out: { pos: Vec3; h: number }[] = [];
    const segs = rig.segments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const h = rig.bodyRadius * (0.5 - i * 0.05);
      if (h <= 0.02) continue;
      out.push({ pos: [s.pos[0], s.pos[1] + s.radius[1], s.pos[2]], h });
    }
    return out;
  }, [rig.segments, rig.bodyRadius, quality.tier]);

  /* refs */
  const bodyGroup = useRef<THREE.Group>(null);
  const segRefs = useRef<(THREE.Mesh | null)[]>([]);
  const headRef = useRef<THREE.Group>(null);
  const eyeLidRef = useRef<THREE.Group>(null);
  const upperRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lowerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const footRefs = useRef<(THREE.Mesh | null)[]>([]);
  const kneeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const tailRefs = useRef<(THREE.Mesh | null)[]>([]);

  const applyPose = (time: number, animate: boolean): void => {
    const f = STEP.frequency * speed;
    const bob = animate ? bodyBob(time, f, bobAmp) : Math.sin(time * 1.4) * bobAmp * 0.18;

    // Breathing: a subtle anisotropic body swell, alive even at rest.
    const breath = 1 + Math.sin(time * 1.6) * 0.02;
    if (bodyGroup.current) {
      bodyGroup.current.position.y = bob;
      bodyGroup.current.scale.set(breath, 2 - breath, breath);
    }

    // Spine flex: a slow lateral S-wave down the body segments.
    const sway = animate ? 1 : 0.35;
    for (let i = 0; i < rig.segments.length; i++) {
      const m = segRefs.current[i];
      if (!m) continue;
      const base = rig.segments[i].pos;
      const phase = i * 0.6;
      m.position.set(
        base[0] + Math.sin(time * f * 0.5 + phase) * swayAmp * sway,
        base[1] + Math.sin(time * f + phase) * swayAmp * 0.25 * sway,
        base[2]
      );
    }

    // Head: gentle nod + idle look-around, plus a periodic blink.
    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(time * 1.3) * 0.06 + 0.04;
      headRef.current.rotation.y = Math.sin(time * 0.7) * 0.12 * sway;
    }
    if (eyeLidRef.current) {
      const spike = Math.pow(Math.max(0, Math.sin(time * 0.8)), 28);
      eyeLidRef.current.scale.y = 1 - spike * 0.9;
    }

    // Legs (2-bone IK) + knee knuckles.
    for (let i = 0; i < rig.legs.length; i++) {
      const leg = rig.legs[i];
      const hip: Vec3 = [leg.hip[0], leg.hip[1] + bob, leg.hip[2]];
      let foot = leg.restFoot;
      if (animate) {
        const cycle = (time * f + gait.footPhase(i, legCount)) % 1;
        const off = footCycleOffset(cycle, stride, lift);
        foot = [leg.restFoot[0] + off[0], leg.restFoot[1] + off[1], leg.restFoot[2] + off[2]];
      }
      const knee = solveIK2Bone(hip, foot, leg.upperLen, leg.lowerLen, leg.bendDir);
      const u = upperRefs.current[i];
      const l = lowerRefs.current[i];
      const ft = footRefs.current[i];
      const kn = kneeRefs.current[i];
      if (u) orientBone(u, hip, knee);
      if (l) orientBone(l, knee, foot);
      if (ft) ft.position.set(foot[0], foot[1], foot[2]);
      if (kn) kn.position.set(knee[0], knee[1], knee[2]);
    }

    // Tail: a trailing chain with a lagging sway (spring-like follow-through).
    if (rig.tail) {
      const pts: Vec3[] = [];
      for (let i = 0; i < rig.tail.length; i++) {
        const rest = rig.tail[i];
        const swayX = i === 0 ? 0 : Math.sin(time * f * 1.1 - i * 0.8) * (0.05 * i) * (animate ? 1 : 0.4);
        pts.push([rest[0] + swayX, rest[1] + bob * (1 - i / rig.tail.length), rest[2]]);
      }
      for (let i = 1; i < pts.length; i++) {
        const t = tailRefs.current[i - 1];
        if (t) orientBone(t, pts[i - 1], pts[i]);
      }
    }
  };

  // Subtle emissive energy wave travelling head→tail, scaled by fitness. Kept
  // gentle so the creature reads as a solid, lit teal form on the white stage —
  // a soft "thinking" shimmer rather than a neon blob.
  const updateEnergy = (time: number, animate: boolean): void => {
    const amp = 0.18 + fitness * 0.5;
    const base = 0.14 + fitness * 0.25;
    const speedE = animate ? 3.0 : 1.4;
    for (let i = 0; i < mats.body.length; i++) {
      const pulse = 0.5 + 0.5 * Math.sin(time * speedE - i * 0.7);
      mats.body[i].emissiveIntensity = base + pulse * amp;
    }
  };

  // Initial/static pose (also covers demand-frameloop where useFrame is idle).
  useLayoutEffect(() => {
    applyPose(0, false);
    updateEnergy(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, walk, quality]);

  useFrame((state) => {
    applyPose(state.clock.elapsedTime, walk);
    updateEnergy(state.clock.elapsedTime, walk);
  });

  const headMat = mats.body[mats.body.length - 1];

  return (
    <group>
      {/* Body, head, eyes, tail, spines breathe/sway together. */}
      <group ref={bodyGroup}>
        {rig.segments.map((s, i) => (
          <mesh
            key={`seg-${i}`}
            ref={(el) => void (segRefs.current[i] = el)}
            position={s.pos}
            scale={s.radius}
            material={mats.body[i]}
            castShadow
          >
            <sphereGeometry args={[1, seg, Math.max(8, seg / 2)]} />
          </mesh>
        ))}

        {/* Dorsal spines (fine detail). */}
        {spines.map((sp, i) => (
          <mesh key={`spine-${i}`} position={sp.pos} material={mats.limb} castShadow>
            <coneGeometry args={[rig.bodyRadius * 0.12, sp.h, 5]} />
          </mesh>
        ))}

        <group ref={headRef} position={rig.head.pos}>
          <mesh material={headMat} castShadow>
            <sphereGeometry args={[rig.head.radius, seg, Math.max(8, seg / 2)]} />
          </mesh>
          {rig.genome.head === "crest" ? (
            <mesh position={[0, rig.head.radius, 0]} material={mats.limb}>
              <coneGeometry args={[rig.head.radius * 0.5, rig.head.radius * 1.4, 5]} />
            </mesh>
          ) : null}

          {/* Layered eyes (sclera + iris + pupil) under a shared blink lid. */}
          <group ref={eyeLidRef}>
            {rig.eyes.map((e, i) => {
              const local: Vec3 = [e[0] - rig.head.pos[0], e[1] - rig.head.pos[1], e[2] - rig.head.pos[2]];
              const r = rig.head.radius * 0.18;
              return (
                <group key={`eye-${i}`} position={local}>
                  <mesh material={mats.sclera}>
                    <sphereGeometry args={[r, 12, 12]} />
                  </mesh>
                  <mesh position={[0, 0, r * 0.65]} material={mats.iris}>
                    <sphereGeometry args={[r * 0.6, 12, 12]} />
                  </mesh>
                  <mesh position={[0, 0, r * 0.95]} material={mats.pupil}>
                    <sphereGeometry args={[r * 0.3, 8, 8]} />
                  </mesh>
                </group>
              );
            })}
          </group>
        </group>

        {/* Tail cylinders (oriented imperatively each frame). */}
        {rig.tail
          ? rig.tail.slice(1).map((_, i) => (
              <mesh key={`tail-${i}`} ref={(el) => void (tailRefs.current[i] = el)} material={mats.limb} castShadow>
                <cylinderGeometry args={[limbRadius * (1 - i * 0.18), limbRadius * (0.85 - i * 0.18), 1, Math.max(6, limbRad / 2)]} />
              </mesh>
            ))
          : null}
      </group>

      {/* Legs (animated imperatively). */}
      {rig.legs.map((_, i) => (
        <group key={`leg-${i}`}>
          <mesh ref={(el) => void (upperRefs.current[i] = el)} geometry={upperGeo} material={mats.limb} castShadow />
          <mesh ref={(el) => void (lowerRefs.current[i] = el)} geometry={lowerGeo} material={mats.limb} castShadow />
          <mesh ref={(el) => void (kneeRefs.current[i] = el)} geometry={kneeGeo} material={mats.limb} />
          <mesh ref={(el) => void (footRefs.current[i] = el)} material={mats.limb} castShadow>
            <FootGeometry style={rig.genome.feet} radius={limbRadius * 1.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Foot geometry chosen by style (point / pad / claw). */
function FootGeometry({ style, radius }: { style: CreatureRig["genome"]["feet"]; radius: number }) {
  if (style === "claw") return <coneGeometry args={[radius * 1.1, radius * 2.2, 6]} />;
  if (style === "pad") return <sphereGeometry args={[radius, 12, 10]} />;
  return <sphereGeometry args={[radius * 0.8, 10, 8]} />;
}
