// Renders an assembled CreatureRig and animates its gait imperatively (refs +
// useFrame), so the single "champion" creature stays at 60fps without a React
// re-render per frame. When `walk` is false it holds a static rest pose.
//
// The creature is the hero "intelligence" element, so its materials glow
// (emissive pushed past 1 -> Bloom picks it out).

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { glow } from "../palette";
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
  /** Animate the gait. When false, a static rest pose is held. */
  walk?: boolean;
  /** Walk speed multiplier (drives step frequency). */
  speed?: number;
}

export function Creature({ rig, walk = false, speed = 1 }: CreatureProps) {
  const { surface } = rig.genome;
  const legCount = rig.legs.length as LegCount;
  const gait = useMemo(() => gaitFor(legCount), [legCount]);

  const limbRadius = rig.bodyRadius * 0.22;
  const bobAmp = rig.standHeight * 0.06;
  const stride = STEP.stride * rig.scale;
  const lift = STEP.lift * rig.scale;

  /* materials */
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: rig.color,
        emissive: new THREE.Color(rig.color),
        emissiveIntensity: glow(1.35),
        roughness: 0.4,
        metalness: 0.1,
        flatShading: surface === "faceted",
        wireframe: surface === "wire",
      }),
    [rig.color, surface]
  );
  const limbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: rig.color,
        emissive: new THREE.Color(rig.color),
        emissiveIntensity: glow(1.0),
        roughness: 0.5,
        metalness: 0.1,
        flatShading: surface === "faceted",
        wireframe: surface === "wire",
      }),
    [rig.color, surface]
  );
  const eyeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#FAF8F0",
        emissive: new THREE.Color("#FAF8F0"),
        emissiveIntensity: glow(2.0),
      }),
    []
  );

  /* shared limb geometries (radius constant; only length is animated via scale) */
  const upperGeo = useMemo(
    () => new THREE.CylinderGeometry(limbRadius, limbRadius * 0.85, 1, 8),
    [limbRadius]
  );
  const lowerGeo = useMemo(
    () => new THREE.CylinderGeometry(limbRadius * 0.85, limbRadius * 0.7, 1, 8),
    [limbRadius]
  );

  /* refs */
  const bodyGroup = useRef<THREE.Group>(null);
  const upperRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lowerRefs = useRef<(THREE.Mesh | null)[]>([]);
  const footRefs = useRef<(THREE.Mesh | null)[]>([]);

  const applyPose = (time: number, animate: boolean): void => {
    const bob = animate ? bodyBob(time, STEP.frequency * speed, bobAmp) : 0;
    if (bodyGroup.current) bodyGroup.current.position.y = bob;

    for (let i = 0; i < rig.legs.length; i++) {
      const leg = rig.legs[i];
      const hip: Vec3 = [leg.hip[0], leg.hip[1] + bob, leg.hip[2]];
      let foot = leg.restFoot;
      if (animate) {
        const cycle = (time * STEP.frequency * speed + gait.footPhase(i, legCount)) % 1;
        const off = footCycleOffset(cycle, stride, lift);
        foot = [leg.restFoot[0] + off[0], leg.restFoot[1] + off[1], leg.restFoot[2] + off[2]];
      }
      const knee = solveIK2Bone(hip, foot, leg.upperLen, leg.lowerLen, leg.bendDir);
      const u = upperRefs.current[i];
      const l = lowerRefs.current[i];
      const f = footRefs.current[i];
      if (u) orientBone(u, hip, knee);
      if (l) orientBone(l, knee, foot);
      if (f) f.position.set(foot[0], foot[1], foot[2]);
    }
  };

  // Initial/static pose (also covers demand-frameloop where useFrame is idle).
  useLayoutEffect(() => {
    applyPose(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, walk]);

  useFrame((state) => {
    applyPose(state.clock.elapsedTime, walk);
  });

  return (
    <group>
      {/* Body, head, eyes, tail bob together. */}
      <group ref={bodyGroup}>
        {rig.segments.map((seg, i) => (
          <mesh key={`seg-${i}`} position={seg.pos} scale={seg.radius} material={bodyMat}>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
        ))}

        <mesh position={rig.head.pos} material={bodyMat}>
          <sphereGeometry args={[rig.head.radius, 16, 12]} />
        </mesh>
        {rig.genome.head === "crest" ? (
          <mesh
            position={[rig.head.pos[0], rig.head.pos[1] + rig.head.radius, rig.head.pos[2]]}
            material={limbMat}
          >
            <coneGeometry args={[rig.head.radius * 0.5, rig.head.radius * 1.4, 5]} />
          </mesh>
        ) : null}

        {rig.eyes.map((e, i) => (
          <mesh key={`eye-${i}`} position={e} material={eyeMat}>
            <sphereGeometry args={[rig.head.radius * 0.16, 8, 8]} />
          </mesh>
        ))}

        {rig.tail
          ? rig.tail.slice(1).map((p, i) => {
              const mid: Vec3 = [
                (rig.tail![i][0] + p[0]) / 2,
                (rig.tail![i][1] + p[1]) / 2,
                (rig.tail![i][2] + p[2]) / 2,
              ];
              const d = Math.hypot(
                p[0] - rig.tail![i][0],
                p[1] - rig.tail![i][1],
                p[2] - rig.tail![i][2]
              );
              const q = new THREE.Quaternion().setFromUnitVectors(
                UP,
                new THREE.Vector3(p[0] - rig.tail![i][0], p[1] - rig.tail![i][1], p[2] - rig.tail![i][2]).normalize()
              );
              return (
                <mesh key={`tail-${i}`} position={mid} quaternion={q} material={limbMat}>
                  <cylinderGeometry args={[limbRadius * (1 - i * 0.18), limbRadius * (0.85 - i * 0.18), d, 6]} />
                </mesh>
              );
            })
          : null}
      </group>

      {/* Legs (animated imperatively). */}
      {rig.legs.map((leg, i) => (
        <group key={`leg-${i}`}>
          <mesh ref={(el) => void (upperRefs.current[i] = el)} geometry={upperGeo} material={limbMat} />
          <mesh ref={(el) => void (lowerRefs.current[i] = el)} geometry={lowerGeo} material={limbMat} />
          <mesh ref={(el) => void (footRefs.current[i] = el)} material={limbMat}>
            {leg ? <FootGeometry style={rig.genome.feet} radius={limbRadius * 1.1} /> : null}
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Foot geometry chosen by style (point / pad / claw). */
function FootGeometry({ style, radius }: { style: CreatureRig["genome"]["feet"]; radius: number }) {
  if (style === "claw") return <coneGeometry args={[radius * 1.1, radius * 2.2, 6]} />;
  if (style === "pad") return <sphereGeometry args={[radius, 10, 8]} />;
  return <sphereGeometry args={[radius * 0.8, 8, 6]} />;
}
