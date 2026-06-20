// Renders an assembled CreatureRig. For C3 the pose is static (feet at their
// rest targets); C4 animates the foot targets and recomputes IK per frame.
// The creature is the hero "intelligence" element, so its materials glow
// (emissive pushed past 1 -> Bloom picks it out).

import { useMemo } from "react";
import * as THREE from "three";
import { glow } from "../palette";
import type { CreatureRig, Vec3 } from "./assemble";
import { solveIK2Bone } from "./assemble";

const UP = new THREE.Vector3(0, 1, 0);

interface BoneProps {
  from: Vec3;
  to: Vec3;
  radius: number;
  material: THREE.Material;
}

/** A capsule/cylinder stretched between two points. */
function Bone({ from, to, radius, material }: BoneProps) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = Math.max(dir.length(), 1e-3);
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    return { position: mid, quaternion: q, length };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[radius, radius * 0.85, length, 8]} />
    </mesh>
  );
}

interface FootProps {
  pos: Vec3;
  style: CreatureRig["genome"]["feet"];
  radius: number;
  material: THREE.Material;
}

function Foot({ pos, style, radius, material }: FootProps) {
  if (style === "claw") {
    return (
      <mesh position={pos} rotation={[Math.PI, 0, 0]} material={material}>
        <coneGeometry args={[radius * 1.1, radius * 2.2, 6]} />
      </mesh>
    );
  }
  if (style === "pad") {
    return (
      <mesh position={pos} scale={[1.3, 0.6, 1.3]} material={material}>
        <sphereGeometry args={[radius, 10, 8]} />
      </mesh>
    );
  }
  // point
  return (
    <mesh position={pos} material={material}>
      <sphereGeometry args={[radius * 0.8, 8, 6]} />
    </mesh>
  );
}

interface CreatureProps {
  rig: CreatureRig;
  /** Optional per-leg foot targets (gait). Defaults to each leg's rest foot. */
  footTargets?: Vec3[];
  /** Optional per-frame body offset (bob/lean). */
  bodyOffset?: Vec3;
}

export function Creature({ rig, footTargets, bodyOffset }: CreatureProps) {
  const { surface } = rig.genome;

  // Shared materials (disposed by R3F on unmount). Memoised by color/surface.
  const bodyMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: rig.color,
      emissive: new THREE.Color(rig.color),
      emissiveIntensity: glow(1.35),
      roughness: 0.4,
      metalness: 0.1,
      flatShading: surface === "faceted",
      wireframe: surface === "wire",
    });
    return m;
  }, [rig.color, surface]);

  const limbMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: rig.color,
      emissive: new THREE.Color(rig.color),
      emissiveIntensity: glow(1.0),
      roughness: 0.5,
      metalness: 0.1,
      flatShading: surface === "faceted",
      wireframe: surface === "wire",
    });
    return m;
  }, [rig.color, surface]);

  const eyeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#FAF8F0",
        emissive: new THREE.Color("#FAF8F0"),
        emissiveIntensity: glow(2.0),
      }),
    []
  );

  const bo = bodyOffset ?? [0, 0, 0];
  const limbRadius = rig.bodyRadius * 0.22;

  return (
    <group position={bo}>
      {/* Body segments (ellipsoids) */}
      {rig.segments.map((seg, i) => (
        <mesh key={`seg-${i}`} position={seg.pos} scale={seg.radius} material={bodyMat}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      ))}

      {/* Head */}
      <mesh position={rig.head.pos} material={bodyMat}>
        <sphereGeometry args={[rig.head.radius, 16, 12]} />
      </mesh>
      {rig.genome.head === "snout" ? (
        <Bone
          from={rig.head.pos}
          to={[rig.head.pos[0], rig.head.pos[1], rig.head.pos[2] + rig.head.radius * 1.4]}
          radius={rig.head.radius * 0.5}
          material={bodyMat}
        />
      ) : null}
      {rig.genome.head === "crest" ? (
        <mesh
          position={[rig.head.pos[0], rig.head.pos[1] + rig.head.radius, rig.head.pos[2]]}
          material={limbMat}
        >
          <coneGeometry args={[rig.head.radius * 0.5, rig.head.radius * 1.4, 5]} />
        </mesh>
      ) : null}

      {/* Eyes */}
      {rig.eyes.map((e, i) => (
        <mesh key={`eye-${i}`} position={e} material={eyeMat}>
          <sphereGeometry args={[rig.head.radius * 0.16, 8, 8]} />
        </mesh>
      ))}

      {/* Legs (2-bone IK: hip -> knee -> foot) */}
      {rig.legs.map((leg, i) => {
        const foot = footTargets?.[i] ?? leg.restFoot;
        const knee = solveIK2Bone(leg.hip, foot, leg.upperLen, leg.lowerLen, leg.bendDir);
        return (
          <group key={`leg-${i}`}>
            <Bone from={leg.hip} to={knee} radius={limbRadius} material={limbMat} />
            <Bone from={knee} to={foot} radius={limbRadius * 0.85} material={limbMat} />
            <Foot pos={foot} style={rig.genome.feet} radius={limbRadius * 1.1} material={limbMat} />
          </group>
        );
      })}

      {/* Tail */}
      {rig.tail
        ? rig.tail.slice(1).map((p, i) => (
            <Bone
              key={`tail-${i}`}
              from={rig.tail![i]}
              to={p}
              radius={limbRadius * (1 - i * 0.18)}
              material={limbMat}
            />
          ))
        : null}
    </group>
  );
}
