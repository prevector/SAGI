import { Fragment, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  Color,
  LatheGeometry,
  Mesh,
  PCFShadowMap,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3
} from "three";
import type { EvolutionGene } from "@sagi/evolution";
import type { TrainingStatus } from "./state";
import { clamp01, sampleMorph, summarizeCreatureGene, type CreaturePhenotype } from "./creatureLibrary";
import styles from "./GeneTerminal.module.css";

interface CreatureViewportProps {
  gene: EvolutionGene;
  phenotype: CreaturePhenotype;
  generation: number;
  status: TrainingStatus;
}

interface VerletPoint {
  position: Vector3;
  previous: Vector3;
  acceleration: Vector3;
  pinned?: boolean;
}

interface PointMeta {
  rest: Vector3;
  radius: number;
  color: string;
  pinned?: boolean;
  role: "body" | "neck" | "head" | "knee" | "foot" | "tail" | "arm" | "hand";
  anchor?: number;
  wobble?: number;
}

interface PlateSpec {
  anchor: number;
  offset: Vector3;
  radius: number;
  height: number;
  color: string;
  lean: number;
}

interface EyeSpec {
  anchor: number;
  offset: Vector3;
  radius: number;
  color: string;
  pupilRadius: number;
  pupilColor: string;
}

interface BoneSpec {
  a: number;
  b: number;
  length: number;
  radiusA: number;
  radiusB: number;
  color: string;
}

interface LegSpec {
  hip: number;
  knee: number;
  foot: number;
  restOffset: Vector3;
  plantedPosition: Vector3;
  planted: boolean;
  phase: number;
  stepHeight: number;
  stepSpeed: number;
  maximumDistance: number;
  stepStart: Vector3;
  stepTarget: Vector3;
  stepProgress: number;
  side: -1 | 1;
  lane: number;
  stride: number;
  liftBias: number;
}

interface CreatureSpec {
  points: PointMeta[];
  bones: BoneSpec[];
  plates: PlateSpec[];
  eyes: EyeSpec[];
  legs: LegSpec[];
  floorY: number;
  bodyIndices: number[];
  neckIndex: number;
  headIndex: number;
  tailIndices: number[];
}

interface MorphologyParams {
  archetype: "biped" | "quadruped" | "hexapod" | "longneck" | "crawler";
  spineSegments: number;
  legPairs: number;
  armPairs: number;
  dorsalPlateCount: number;
  hasTail: boolean;
  uprightness: number;
  bodySpacing: number;
  torsoRadius: number;
  taper: number;
  headRadius: number;
  neckLength: number;
  eyeRadius: number;
  eyeSpacing: number;
  eyeHeight: number;
  pupilRadius: number;
  tailLength: number;
  stride: number;
  hipDrop: number;
  kneeSpread: number;
  footSpread: number;
  armDrop: number;
  armReach: number;
  armLength: number;
  plateHeight: number;
  legHipRadius: number;
  legKneeRadius: number;
  footRadius: number;
  armShoulderRadius: number;
  armHandRadius: number;
  silliness: number;
  bodyColor: string;
  bodyAccentColor: string;
  crestColor: string;
  limbColor: string;
  coolColor: string;
  eyeColor: string;
  cameraRadius: number;
  cameraHeight: number;
  cameraYaw: number;
}

const UP = new Vector3(0, 1, 0);
const TEMP_A = new Vector3();
const TEMP_B = new Vector3();
const TEMP_C = new Vector3();
const TEMP_D = new Vector3();
const TEMP_E = new Vector3();
const TEMP_Q = new Quaternion();
const TEMP_COLOR = new Color();
const TEMP_COLOR_B = new Color();
const JOINT_GEOMETRY = new SphereGeometry(1, 18, 14);
const WORLD_UP = new Vector3(0, 1, 0);

function createTaperedCapsuleGeometry(
  length: number,
  radiusA: number,
  radiusB: number,
  radialSegments = 14,
  capSegments = 5
): LatheGeometry {
  const points: Vector2[] = [];

  for (let index = 0; index <= capSegments; index += 1) {
    const angle = -Math.PI / 2 + (index / capSegments) * (Math.PI / 2);
    points.push(
      new Vector2(
        Math.cos(angle) * radiusA,
        Math.sin(angle) * radiusA
      )
    );
  }

  points.push(new Vector2(radiusA, 0));
  points.push(new Vector2(radiusB, length));

  for (let index = 0; index <= capSegments; index += 1) {
    const angle = (index / capSegments) * (Math.PI / 2);
    points.push(
      new Vector2(
        Math.cos(angle) * radiusB,
        length + Math.sin(angle) * radiusB
      )
    );
  }

  const geometry = new LatheGeometry(points, radialSegments);
  geometry.computeVertexNormals();
  return geometry;
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function sampleWeight(gene: EvolutionGene, index: number): number {
  return gene.weights[index % Math.max(gene.weights.length, 1)] ?? 0;
}

function blendColors(a: string, b: string, t: number): string {
  TEMP_COLOR.set(a);
  TEMP_COLOR_B.set(b);
  return `#${TEMP_COLOR.lerp(TEMP_COLOR_B, Math.max(0, Math.min(1, t))).getHexString()}`;
}

function getMorphologyParams(gene: EvolutionGene, phenotype: CreaturePhenotype): MorphologyParams {
  const summary = summarizeCreatureGene(gene);
  const uprightness = 0.06 + sampleMorph(gene, 41, 1.8) * 0.9;
  const archetype = summary.archetype;
  const spineSegments = summary.spineSegments;
  const legPairs = summary.legPairs;
  const armPairs = summary.armPairs;
  const dorsalPlateCount = Math.max(1, 2 + Math.floor(sampleMorph(gene, 47, 1.6) * 4.999));
  const hasTail = sampleMorph(gene, 23, 1.6) > 0.22;
  const silliness = 0.22 + sampleMorph(gene, 2, 1.4) * 0.95;

  return {
    archetype,
    spineSegments,
    legPairs,
    armPairs,
    dorsalPlateCount,
    hasTail,
    uprightness,
    bodySpacing: 0.48 + sampleMorph(gene, 3, 1.5) * 0.5,
    torsoRadius: 0.2 + sampleMorph(gene, 4, 1.7) * 0.34,
    taper: 0.32 + sampleMorph(gene, 5, 1.4) * 0.48,
    headRadius: 0.2 + sampleMorph(gene, 6, 1.6) * 0.3 + silliness * 0.03,
    neckLength: 0.18 + sampleMorph(gene, 7, 1.5) * (0.28 + uprightness * 0.72),
    eyeRadius: 0.08 + sampleMorph(gene, 8, 1.5) * 0.09 + silliness * 0.015,
    eyeSpacing: 0.12 + sampleMorph(gene, 9, 1.5) * 0.18,
    eyeHeight: 0.1 + sampleMorph(gene, 10, 1.4) * 0.22,
    pupilRadius: 0.02 + sampleMorph(gene, 11, 1.5) * 0.022,
    tailLength: 0.24 + sampleMorph(gene, 12, 1.5) * 0.86,
    stride: 0.12 + sampleMorph(gene, 14, 1.5) * 0.52,
    hipDrop: 0.28 + sampleMorph(gene, 15, 1.4) * 0.52,
    kneeSpread: 0.16 + sampleMorph(gene, 16, 1.4) * 0.42,
    footSpread: 0.18 + sampleMorph(gene, 17, 1.4) * 0.52,
    armDrop: 0.14 + sampleMorph(gene, 24, 1.4) * 0.42,
    armReach: 0.12 + sampleMorph(gene, 25, 1.4) * 0.42,
    armLength: 0.18 + sampleMorph(gene, 26, 1.4) * 0.48,
    plateHeight: 0.12 + sampleMorph(gene, 27, 1.4) * 0.28,
    legHipRadius: 0.12 + sampleMorph(gene, 28, 1.6) * 0.3,
    legKneeRadius: 0.08 + sampleMorph(gene, 29, 1.6) * 0.2,
    footRadius: 0.06 + sampleMorph(gene, 30, 1.6) * 0.14,
    armShoulderRadius: 0.07 + sampleMorph(gene, 31, 1.6) * 0.16,
    armHandRadius: 0.05 + sampleMorph(gene, 32, 1.6) * 0.1,
    silliness,
    bodyColor: phenotype.bodyFrom,
    bodyAccentColor: phenotype.bodyTo,
    crestColor: phenotype.crest,
    limbColor: phenotype.limb,
    coolColor: phenotype.cool,
    eyeColor: phenotype.eye,
    cameraRadius: 7.2 + Math.abs(sampleWeight(gene, 18)) * 1.4,
    cameraHeight: 1.9 + Math.abs(sampleWeight(gene, 19)) * 0.7,
    cameraYaw: 0.62 + Math.abs(sampleWeight(gene, 20)) * 0.42
  };
}

function createCreatureSpec(gene: EvolutionGene, phenotype: CreaturePhenotype): CreatureSpec {
  const params = getMorphologyParams(gene, phenotype);
  const bodyCount = params.spineSegments;
  const legPairs = params.legPairs;
  const points: PointMeta[] = [];
  const bones: BoneSpec[] = [];
  const plates: PlateSpec[] = [];
  const eyes: EyeSpec[] = [];
  const legs: LegSpec[] = [];
  const bodyIndices: number[] = [];
  const tailIndices: number[] = [];
  const floorY = -1.55;

  function addPoint(meta: PointMeta): number {
    points.push(meta);
    return points.length - 1;
  }

  function addBone(a: number, b: number, radiusA: number, radiusB: number, color: string) {
    bones.push({
      a,
      b,
      length: points[a].rest.distanceTo(points[b].rest),
      radiusA,
      radiusB,
      color
    });
  }

  const spineGrowth: number[] = [];
  const spineDepth: number[] = [];
  const spineHeight: number[] = [];
  let previousGrowth = 0.82 + sampleMorph(gene, 100, 1.4) * 0.18;
  for (let index = 0; index < bodyCount; index += 1) {
    const bud = sampleMorph(gene, 100 + index * 3, 1.8);
    const growth = index === 0 ? previousGrowth : clamp01(previousGrowth - 0.18 + bud * 0.78);
    spineGrowth.push(growth);
    spineDepth.push((sampleMorph(gene, 101 + index * 3, 1.4) - 0.5) * 0.16);
    spineHeight.push(sampleMorph(gene, 102 + index * 3, 1.6));
    previousGrowth = growth;
  }

  const spineRest: Vector3[] = [];
  let advance = 0;
  for (let index = 0; index < bodyCount; index += 1) {
    const t = bodyCount === 1 ? 0 : index / (bodyCount - 1);
    if (index > 0) {
      const segmentGrowth = (spineGrowth[index - 1] + spineGrowth[index]) * 0.5;
      advance += params.bodySpacing * (0.08 + segmentGrowth * 1.08);
    }
    const horizontal = advance * (1 - params.uprightness * 0.84);
    const vertical =
      advance * (0.04 + params.uprightness * 0.74) +
      (spineHeight[index] - 0.5) * (0.08 + params.uprightness * 0.42) +
      Math.pow(t, 1.4) * params.uprightness * 0.68;
    spineRest.push(new Vector3(horizontal, vertical, spineDepth[index]));
  }
  const firstX = spineRest[0]?.x ?? 0;
  const lastX = spineRest[bodyCount - 1]?.x ?? 0;
  const centerX = (firstX + lastX) * 0.5;
  for (const rest of spineRest) {
    rest.x -= centerX;
  }

  for (let index = 0; index < bodyCount; index += 1) {
    const t = bodyCount === 1 ? 0 : index / (bodyCount - 1);
    const growth = spineGrowth[index];
    const radius =
      0.04 +
      growth * params.torsoRadius * (0.45 + Math.sin(t * Math.PI) * 0.92 + sampleMorph(gene, 140 + index, 1.3) * 0.18);
    const color = blendColors(
      params.bodyColor,
      params.bodyAccentColor,
      0.12 + t * 0.76 + (growth - 0.5) * 0.06
    );
    bodyIndices.push(
      addPoint({
        rest: spineRest[index],
        radius,
        color,
        pinned: true,
        role: "body",
        wobble: 0.04 + growth * 0.06 + t * 0.03
      })
    );
  }

  for (let index = 0; index < bodyIndices.length - 1; index += 1) {
    const a = bodyIndices[index];
    const b = bodyIndices[index + 1];
    addBone(a, b, points[a].radius * 0.95, points[b].radius * 0.95, blendColors(points[a].color, points[b].color, 0.5));
  }

  const neckBase = bodyIndices[bodyIndices.length - 1];
  const neckIndex = addPoint({
    rest: points[neckBase].rest.clone().add(
      new Vector3(
        params.neckLength * (0.28 + (1 - params.uprightness) * 0.38),
        params.neckLength * (0.32 + params.uprightness * 0.82),
        0
      )
    ),
    radius: params.headRadius * (0.34 + sampleMorph(gene, 150, 1.4) * 0.3),
    color: blendColors(params.bodyAccentColor, params.bodyColor, 0.35),
    role: "neck",
    anchor: neckBase,
    wobble: 0.04 + params.silliness * 0.04
  });
  addBone(neckBase, neckIndex, points[neckBase].radius * 0.42, points[neckIndex].radius * 0.92, points[neckIndex].color);

  const headIndex = addPoint({
    rest: points[neckIndex].rest.clone().add(
      new Vector3(
        params.headRadius * (0.7 + (1 - params.uprightness) * 0.52 + params.silliness * 0.24),
        params.headRadius * (0.08 + params.uprightness * 0.22),
        0
      )
    ),
    radius: params.headRadius,
    color: blendColors(params.bodyAccentColor, params.crestColor, 0.35),
    role: "head",
    anchor: neckIndex,
    wobble: 0.08 + params.silliness * 0.06
  });
  addBone(neckIndex, headIndex, points[neckIndex].radius * 0.82, points[headIndex].radius * 0.92, points[headIndex].color);

  for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
    const side = sideIndex === 0 ? -1 : 1;
    eyes.push({
      anchor: headIndex,
      offset: new Vector3(params.headRadius * 0.78, params.eyeHeight, side * params.eyeSpacing),
      radius: params.eyeRadius,
      color: params.eyeColor,
      pupilRadius: params.pupilRadius * 1.35,
      pupilColor: "#201a16"
    });
  }

  if (params.hasTail) {
    const tailBase = bodyIndices[0];
    let parentIndex = tailBase;
    let parentGrowth = spineGrowth[0];
    for (let index = 0; index < 3; index += 1) {
      const bud = sampleMorph(gene, 170 + index * 3, 1.7);
      const growth = clamp01((parentGrowth - 0.12) + bud * 0.72);
      const radius = 0.025 + growth * (0.09 - index * 0.012);
      const tailPoint = addPoint({
        rest: points[parentIndex].rest.clone().add(
          new Vector3(
            -params.tailLength * (0.18 + growth * (0.24 - index * 0.04)),
            0.02 + growth * 0.08,
            (sampleMorph(gene, 171 + index * 3, 1.3) - 0.5) * 0.06
          )
        ),
        radius,
        color: blendColors(params.limbColor, params.crestColor, 0.18 + index * 0.16),
        role: "tail",
        anchor: parentIndex,
        wobble: 0.06 + growth * 0.08
      });
      tailIndices.push(tailPoint);
      addBone(parentIndex, tailPoint, points[parentIndex].radius * 0.52, points[tailPoint].radius * 0.96, points[tailPoint].color);
      parentIndex = tailPoint;
      parentGrowth = growth;
    }
  }

  const plateStart = 0;
  const plateEnd = bodyIndices.length - 1;
  for (let plateIndex = 0; plateIndex < params.dorsalPlateCount; plateIndex += 1) {
    const t = params.dorsalPlateCount <= 1 ? 0.5 : plateIndex / (params.dorsalPlateCount - 1);
    const attachIndex = bodyIndices[
      Math.min(
        bodyIndices.length - 1,
        plateStart + Math.round(t * Math.max(1, plateEnd - plateStart))
      )
    ];
    const plateGrowth =
      clamp01((spineGrowth[attachIndex] - 0.24) * 1.24) *
      sampleMorph(gene, 190 + plateIndex * 2, 1.7);
    const side = plateIndex % 2 === 0 ? -1 : 1;
    const plateRadius = 0.02 + plateGrowth * (0.08 + Math.sin(t * Math.PI) * 0.06);
    const surfaceLift =
      points[attachIndex].radius +
      plateRadius * 0.7 +
      params.plateHeight * plateGrowth * (0.3 + Math.sin(t * Math.PI) * 0.8);
    plates.push({
      anchor: attachIndex,
      offset: new Vector3(0.02, surfaceLift, side * 0.045),
      radius: plateRadius,
      height: 0.06 + params.plateHeight * plateGrowth * (0.75 + Math.sin(t * Math.PI) * 0.9),
      color: blendColors(params.crestColor, params.bodyAccentColor, t * 0.6 + 0.2),
      lean: side * 0.12
    });
  }

  for (let pairIndex = 0; pairIndex < legPairs; pairIndex += 1) {
    const attachSlot = Math.min(
      bodyIndices.length - 2,
      1 + Math.round((pairIndex / Math.max(legPairs - 1, 1)) * Math.max(1, bodyIndices.length - 3))
    );
    const attach = bodyIndices[
      attachSlot
    ];
    const hostGrowth = spineGrowth[attachSlot];

    for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
      const side = sideIndex === 0 ? -1 : 1;
      const limbBud = sampleMorph(gene, 220 + pairIndex * 4 + sideIndex * 2, 1.9);
      const thicknessBud = sampleMorph(gene, 221 + pairIndex * 4 + sideIndex * 2, 1.8);
      const growth = clamp01((hostGrowth - 0.28) * 1.35) * limbBud;
      const hipRadius = 0.025 + growth * (params.legHipRadius * (0.55 + thicknessBud * 0.95));
      const kneeRadius = 0.02 + growth * (params.legKneeRadius * (0.45 + thicknessBud * 1.05));
      const footRadius = 0.018 + growth * (params.footRadius * (0.5 + thicknessBud));
      const legLength = params.hipDrop * (0.92 + growth * 0.22);
      const forwardReach = params.stride * (0.28 + growth * 0.72);
      const lateralReach = params.footSpread * (0.38 + growth * 0.82);
      const kneeSpread = params.kneeSpread * (0.22 + growth * 0.92);
      const kneeLift = Math.max(0.08, legLength * (0.22 + growth * 0.12));
      const footRest = points[attach].rest.clone().add(
        new Vector3(forwardReach, floorY - points[attach].rest.y, side * lateralReach)
      );
      const kneeRest = points[attach].rest.clone().lerp(footRest, 0.5).add(
        new Vector3(
          forwardReach * 0.12,
          kneeLift,
          side * kneeSpread
        )
      );
      const knee = addPoint({
        rest: kneeRest,
        radius: kneeRadius,
        color: blendColors(params.limbColor, params.bodyAccentColor, 0.22 + thicknessBud * 0.25),
        role: "knee"
      });
      const foot = addPoint({
        rest: footRest,
        radius: footRadius,
        color: side > 0 ? blendColors(params.coolColor, params.limbColor, 0.35 + thicknessBud * 0.12) : blendColors(params.bodyAccentColor, params.limbColor, 0.35 + thicknessBud * 0.12),
        pinned: true,
        role: "foot"
      });

      addBone(attach, knee, Math.max(points[attach].radius * 0.3, hipRadius), points[knee].radius * 0.98, points[knee].color);
      addBone(knee, foot, points[knee].radius * 1.04, points[foot].radius * 0.92, points[foot].color);

      legs.push({
        hip: attach,
        knee,
        foot,
        restOffset: footRest.clone().sub(points[attach].rest),
        plantedPosition: footRest.clone(),
        planted: true,
        phase: pairIndex * 0.92 + sideIndex * Math.PI + (pairIndex % 2 === 0 ? 0 : Math.PI * 0.45),
        stepHeight: 0,
        stepSpeed: 2,
        maximumDistance: 0.22,
        stepStart: footRest.clone(),
        stepTarget: footRest.clone(),
        stepProgress: 1,
        side,
        lane: pairIndex,
        stride: params.stride * (0.28 + growth * 0.72),
        liftBias: 0.7 + growth * 0.8 + pairIndex * 0.04
      });
    }
  }

  const armAttachStart = Math.max(1, bodyIndices.length - 3);
  for (let armPair = 0; armPair < params.armPairs; armPair += 1) {
    const attach = bodyIndices[Math.min(bodyIndices.length - 1, armAttachStart + armPair)];
    const hostGrowth = spineGrowth[Math.min(bodyIndices.length - 1, armAttachStart + armPair)];
    for (let sideIndex = 0; sideIndex < 2; sideIndex += 1) {
      const side = sideIndex === 0 ? -1 : 1;
      const armBud = sampleMorph(gene, 260 + armPair * 4 + sideIndex * 2, 1.9);
      const armThickness = sampleMorph(gene, 261 + armPair * 4 + sideIndex * 2, 1.8);
      const growth = clamp01((hostGrowth - 0.34) * 1.2) * armBud;
      const elbowRadius = 0.018 + growth * (params.armShoulderRadius * (0.55 + armThickness));
      const handRadius = 0.016 + growth * (params.armHandRadius * (0.55 + armThickness));
      const armReach = params.armReach * (0.72 + growth * 0.34);
      const armDrop = params.armDrop * (0.7 + growth * 0.26);
      const handReach = params.armLength * (0.7 + growth * 0.34);
      const handDepth = params.armReach * (0.32 + growth * 0.34);
      const handRest = points[attach].rest.clone().add(
        new Vector3(armReach + handReach, -armDrop - params.armDrop * 0.16, side * (armReach + handDepth))
      );
      const elbowRest = points[attach].rest.clone().lerp(handRest, 0.5).add(
        new Vector3(
          armReach * 0.06,
          params.armDrop * 0.12,
          side * params.armReach * 0.18
        )
      );
      const elbow = addPoint({
        rest: elbowRest,
        radius: elbowRadius,
        color: blendColors(params.limbColor, params.coolColor, 0.12 + sideIndex * 0.12 + armThickness * 0.12),
        role: "arm"
      });
      const hand = addPoint({
        rest: handRest,
        radius: handRadius,
        color: blendColors(params.coolColor, params.eyeColor, 0.18),
        role: "hand"
      });
      addBone(attach, elbow, Math.max(points[attach].radius * 0.18, points[elbow].radius * 1.12), points[elbow].radius * 0.98, points[elbow].color);
      addBone(elbow, hand, points[elbow].radius * 1.04, points[hand].radius * 0.92, points[hand].color);
    }
  }

  return { points, bones, plates, eyes, legs, floorY, bodyIndices, neckIndex, headIndex, tailIndices };
}

function cloneSimulation(spec: CreatureSpec) {
  return {
    points: spec.points.map((point) => ({
      position: point.rest.clone(),
      previous: point.rest.clone(),
      acceleration: new Vector3(),
      pinned: point.pinned
    })),
    legs: spec.legs.map((leg) => ({
      ...leg,
      restOffset: leg.restOffset.clone(),
      plantedPosition: leg.plantedPosition.clone(),
      stepStart: leg.stepStart.clone(),
      stepTarget: leg.stepTarget.clone()
    }))
  };
}

function applyGravity(points: VerletPoint[]) {
  for (const point of points) {
    if (!point.pinned) {
      point.acceleration.y -= 13.5;
    }
  }
}

function integratePoint(point: VerletPoint, dt: number, damping = 0.9) {
  if (point.pinned) return;
  TEMP_A.subVectors(point.position, point.previous).multiplyScalar(damping);
  TEMP_B.copy(point.position);
  point.position.add(TEMP_A).addScaledVector(point.acceleration, dt * dt);
  point.previous.copy(TEMP_B);
  point.acceleration.set(0, 0, 0);
}

function solveDistanceConstraint(a: VerletPoint, b: VerletPoint, targetLength: number) {
  TEMP_A.subVectors(b.position, a.position);
  const distance = TEMP_A.length();
  if (distance < 1e-6) return;
  const error = (distance - targetLength) / distance;

  if (!a.pinned && !b.pinned) {
    TEMP_A.multiplyScalar(error * 0.5);
    a.position.add(TEMP_A);
    b.position.sub(TEMP_A);
  } else if (a.pinned && !b.pinned) {
    b.position.addScaledVector(TEMP_A, -error);
  } else if (!a.pinned && b.pinned) {
    a.position.addScaledVector(TEMP_A, error);
  }
}

function solveSeparationConstraint(
  a: VerletPoint,
  b: VerletPoint,
  minDistance: number
) {
  TEMP_A.subVectors(b.position, a.position);
  let distance = TEMP_A.length();
  if (distance < 1e-6) {
    TEMP_A.set(0, 0, 1);
    distance = 1;
  }
  if (distance >= minDistance) return;
  const overlap = minDistance - distance;
  TEMP_A.divideScalar(distance);

  if (!a.pinned && !b.pinned) {
    a.position.addScaledVector(TEMP_A, -overlap * 0.5);
    b.position.addScaledVector(TEMP_A, overlap * 0.5);
  } else if (a.pinned && !b.pinned) {
    b.position.addScaledVector(TEMP_A, overlap);
  } else if (!a.pinned && b.pinned) {
    a.position.addScaledVector(TEMP_A, -overlap);
  }
}

function updateBoneMesh(mesh: Mesh, bone: BoneSpec, points: Vector3[]) {
  const a = points[bone.a];
  const b = points[bone.b];
  TEMP_A.subVectors(b, a);
  const length = TEMP_A.length();
  if (length < 1e-5) return;
  TEMP_A.divideScalar(length);
  mesh.position.copy(a);
  TEMP_Q.setFromUnitVectors(UP, TEMP_A);
  mesh.quaternion.copy(TEMP_Q);
  mesh.scale.setScalar(1);
  mesh.scale.y = length / bone.length;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function CreatureWalker({
  gene,
  phenotype,
  generation,
  status
}: CreatureViewportProps) {
  const jointRefs = useRef<Array<Mesh | null>>([]);
  const boneRefs = useRef<Array<Mesh | null>>([]);
  const plateRefs = useRef<Array<Mesh | null>>([]);
  const eyeRefs = useRef<Array<Mesh | null>>([]);
  const pupilRefs = useRef<Array<Mesh | null>>([]);
  const spec = useMemo(() => createCreatureSpec(gene, phenotype), [gene, phenotype]);
  const simulationRef = useRef(cloneSimulation(spec));
  const motionRef = useRef({
    position: new Vector3(0, -0.05, 0),
    velocity: new Vector3(0.55, 0, 0.12),
    heading: 0.24,
    orbitAngle: 0.24,
    orbitRadiusX: 3.8,
    orbitRadiusZ: 2.6
  });
  const boneGeometries = useMemo(
    () => spec.bones.map((bone) => createTaperedCapsuleGeometry(bone.length, bone.radiusA, bone.radiusB)),
    [spec.bones]
  );
  const repulsionSkipPairs = useMemo(() => {
    const pairs = new Set<string>();
    for (const bone of spec.bones) {
      pairs.add(pairKey(bone.a, bone.b));
    }
    for (const leg of spec.legs) {
      pairs.add(pairKey(leg.hip, leg.foot));
    }
    return pairs;
  }, [spec.bones, spec.legs]);
  useEffect(() => {
    motionRef.current = {
      position: new Vector3(0, -0.05, 0),
      velocity: new Vector3(0.55, 0, 0.12),
      heading: 0.24,
      orbitAngle: 0.24,
      orbitRadiusX: 3.8,
      orbitRadiusZ: 2.6
    };

    simulationRef.current = cloneSimulation(spec);
    const simulation = simulationRef.current;
    for (const point of simulation.points) {
      point.position.x += motionRef.current.position.x;
      point.position.y += motionRef.current.position.y;
      point.position.z += motionRef.current.position.z;
      point.previous.copy(point.position);
    }
    for (const leg of simulation.legs) {
      leg.plantedPosition.x += motionRef.current.position.x;
      leg.plantedPosition.y += motionRef.current.position.y;
      leg.plantedPosition.z += motionRef.current.position.z;
      leg.stepStart.copy(leg.plantedPosition);
      leg.stepTarget.copy(leg.plantedPosition);
    }
  }, [spec]);

  useEffect(() => {
    return () => {
      for (const geometry of boneGeometries) geometry.dispose();
    };
  }, [boneGeometries]);

  useFrame((state, delta) => {
    const simulation = simulationRef.current;
    const points = simulation.points;
    const legs = simulation.legs;
    const motion = motionRef.current;
    const time = state.clock.elapsedTime;
    const locomotion = status === "running" ? 1 : 0.4;
    const cycle = time * (1.1 + locomotion * 0.95);
    const dt = Math.min(delta, 1 / 30);
    motion.position.set(0, -0.05, 0);
    motion.velocity.set(1, 0, 0);
    motion.heading = 0;

    const walkStrength = status === "running" ? 0.96 : 0.48;
    const forward = TEMP_B.set(1, 0, 0);
    const lateral = TEMP_C.set(0, 0, 1);
    const torsoDrive = Math.sin(cycle);
    const torsoLift = Math.cos(cycle * 2.1);
    const torsoSway = Math.sin(cycle + Math.PI / 2);

    let leftStride = 0;
    let rightStride = 0;
    let leftCount = 0;
    let rightCount = 0;
    for (const leg of legs) {
      const gait = Math.sin(cycle * (0.84 + leg.lane * 0.045) + leg.phase);
      if (leg.side < 0) {
        leftStride += gait;
        leftCount += 1;
      } else {
        rightStride += gait;
        rightCount += 1;
      }
    }
    leftStride /= Math.max(leftCount, 1);
    rightStride /= Math.max(rightCount, 1);
    const strideDifferential = leftStride - rightStride;

    spec.points.forEach((meta, index) => {
      if (meta.role === "body") {
        const wobble = meta.wobble ?? 0.05;
        const point = points[index];
        const spineT = spec.bodyIndices.length <= 1 ? 0 : spec.bodyIndices.indexOf(index) / Math.max(spec.bodyIndices.length - 1, 1);
        const foreBias = 0.08 + spineT * 0.14;
        const swayBias = (1 - spineT) * 0.08 + 0.08;
        const liftBias = 0.05 + Math.sin(spineT * Math.PI) * 0.08;
        const lanePhase = Math.sin(cycle * 0.86 + spineT * Math.PI * 2.4);
        const worldRest = TEMP_E.copy(motion.position)
          .addScaledVector(forward, meta.rest.x)
          .addScaledVector(WORLD_UP, meta.rest.y)
          .addScaledVector(lateral, meta.rest.z)
          .addScaledVector(forward, (torsoDrive * foreBias + lanePhase * 0.05) * walkStrength)
          .addScaledVector(lateral, (torsoSway * swayBias + strideDifferential * (0.04 + spineT * 0.05)) * walkStrength)
          .addScaledVector(WORLD_UP, Math.max(0, torsoLift) * liftBias * walkStrength);
        point.position.copy(worldRest).add(
          TEMP_A.set(
            Math.sin(cycle * 0.9 + index * 0.55) * wobble * 0.18 * walkStrength,
            Math.sin(cycle * 1.8 + index * 0.45) * wobble * 0.14,
            Math.cos(cycle * 0.92 + index * 0.7) * wobble * 0.18 * walkStrength
          )
        );
        point.previous.copy(point.position);
      }

      if (meta.role === "neck") {
        points[index].acceleration.addScaledVector(forward, 1.2 + torsoDrive * 0.28);
        points[index].acceleration.addScaledVector(lateral, torsoSway * 0.45 + strideDifferential * 0.42);
        points[index].acceleration.y += 12.2 + Math.max(0, torsoLift) * 0.9;
        points[index].position.y = Math.max(points[index].position.y, motion.position.y + meta.rest.y + 0.02);
      }

      if (meta.role === "head") {
        points[index].acceleration.addScaledVector(forward, 1.35 + torsoDrive * 0.36);
        points[index].acceleration.addScaledVector(lateral, torsoSway * 0.62 + strideDifferential * 0.55);
        points[index].acceleration.y += Math.sin(cycle * 1.35) * 0.24 + 15.2;
        points[index].position.y = Math.max(points[index].position.y, motion.position.y + meta.rest.y + 0.06);
      }

      if (meta.role === "tail") {
        points[index].acceleration.addScaledVector(forward, -1.35);
        points[index].acceleration.addScaledVector(lateral, -strideDifferential * 1.05);
        points[index].acceleration.y += Math.cos(cycle * 0.9) * 0.4 + 0.35;
      }

      if (meta.role === "arm") {
        const armSwing = Math.sin(cycle * 0.88 + index * 0.7);
        const side = meta.rest.z < 0 ? -1 : 1;
        points[index].acceleration.addScaledVector(forward, -armSwing * 1.15);
        points[index].acceleration.addScaledVector(lateral, side * 0.75 + strideDifferential * side * 0.35);
        points[index].acceleration.y += 5.8 + Math.max(0, -armSwing) * 0.5;
      }

      if (meta.role === "hand") {
        const armSwing = Math.sin(cycle * 0.88 + index * 0.7 + 0.6);
        const side = meta.rest.z < 0 ? -1 : 1;
        points[index].acceleration.addScaledVector(forward, -armSwing * 1.45);
        points[index].acceleration.addScaledVector(lateral, side * 0.95 + strideDifferential * side * 0.4);
        points[index].acceleration.y += 5.2 + Math.max(0, -armSwing) * 0.8;
      }
    });

    applyGravity(points);

    for (const leg of legs) {
      const knee = points[leg.knee];
      const hip = points[leg.hip].position;
      const foot = points[leg.foot].position;
      const gait = Math.sin(cycle * (0.84 + leg.lane * 0.045) + leg.phase);
      const lift = Math.max(0, gait);
      const midpoint = TEMP_D.copy(hip).lerp(foot, 0.5);
      const kneeHeight = Math.max(0.08, Math.abs(foot.y - hip.y) * 0.2 + 0.08);
      const kneeWidth = Math.max(0.08, Math.abs(leg.restOffset.z) * 0.25);
      const desiredKnee = TEMP_E.copy(midpoint).add(
        TEMP_A.set(leg.restOffset.x * 0.1, kneeHeight + lift * 0.12, leg.side * kneeWidth)
      );

      knee.acceleration.addScaledVector(forward, gait * (1.05 + walkStrength * 0.4));
      knee.acceleration.y += 4.9 + lift * (3.3 + leg.liftBias);
      knee.acceleration.addScaledVector(lateral, leg.side * (0.84 + walkStrength * 0.34 - lift * 0.18));
      knee.acceleration.addScaledVector(TEMP_B.copy(desiredKnee).sub(knee.position), 18);
    }

    for (let index = 0; index < points.length; index += 1) {
      if (points[index].pinned) continue;
      const role = spec.points[index].role;
      const damping =
        role === "head" ? 0.8 :
        role === "neck" ? 0.78 :
        role === "tail" ? 0.76 :
        role === "arm" ? 0.74 :
        role === "hand" ? 0.72 :
        role === "knee" ? 0.73 :
        0.78;
      integratePoint(points[index], dt, damping);
    }

    for (let iteration = 0; iteration < 8; iteration += 1) {
      for (const bone of spec.bones) {
        solveDistanceConstraint(points[bone.a], points[bone.b], bone.length);
      }

      for (let left = 0; left < points.length; left += 1) {
        for (let right = left + 1; right < points.length; right += 1) {
          const leftMeta = spec.points[left];
          const rightMeta = spec.points[right];
          if (repulsionSkipPairs.has(pairKey(left, right))) {
            continue;
          }
          if (
            leftMeta.role === "head" ||
            leftMeta.role === "neck" ||
            rightMeta.role === "head" ||
            rightMeta.role === "neck"
          ) {
            continue;
          }
          const minDistance = (leftMeta.radius + rightMeta.radius) * 0.72;
          solveSeparationConstraint(points[left], points[right], minDistance);
        }
      }

      for (const leg of legs) {
        points[leg.foot].position.y = Math.max(points[leg.foot].position.y, spec.floorY);
      }
    }

    for (let index = 0; index < points.length; index += 1) {
      const mesh = jointRefs.current[index];
      if (!mesh) continue;
      mesh.position.copy(points[index].position);
      mesh.scale.setScalar(spec.points[index].radius);
    }

    const pointPositions = points.map((point) => point.position);
    for (let index = 0; index < spec.bones.length; index += 1) {
      const mesh = boneRefs.current[index];
      if (!mesh) continue;
      updateBoneMesh(mesh, spec.bones[index], pointPositions);
    }

    for (let index = 0; index < spec.plates.length; index += 1) {
      const mesh = plateRefs.current[index];
      const plate = spec.plates[index];
      if (!mesh || !plate) continue;
      const anchor = points[plate.anchor].position;
      const direction = TEMP_A.copy(plate.offset).normalize();
      const worldOffset = TEMP_B.copy(direction).multiplyScalar(spec.points[plate.anchor].radius + plate.radius * 0.45);
      mesh.position.copy(anchor).add(worldOffset);
      TEMP_Q.setFromUnitVectors(UP, direction);
      mesh.quaternion.copy(TEMP_Q);
      mesh.rotateZ(plate.lean);
      mesh.scale.set(plate.radius, plate.height, plate.radius * 0.72);
    }

    const pupilDirection = forward.clone().normalize();
    for (let index = 0; index < spec.eyes.length; index += 1) {
      const eyeMesh = eyeRefs.current[index];
      const pupilMesh = pupilRefs.current[index];
      const eye = spec.eyes[index];
      if (!eyeMesh || !pupilMesh || !eye) continue;
      const anchor = points[eye.anchor].position;
      const eyeDirection = TEMP_A.copy(eye.offset).normalize();
      const eyePosition = TEMP_B.copy(anchor).addScaledVector(
        eyeDirection,
        spec.points[eye.anchor].radius + eye.radius * 0.2
      );
      const side = Math.sign(eye.offset.z) || 1;
      const pupilDirection = TEMP_C.copy(forward)
        .addScaledVector(lateral, side * 0.14)
        .normalize();
      eyeMesh.position.copy(eyePosition);
      eyeMesh.scale.setScalar(eye.radius);
      pupilMesh.position.copy(eyePosition).addScaledVector(pupilDirection, eye.radius * 0.94);
      pupilMesh.scale.setScalar(eye.pupilRadius);
    }
  });

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, spec.floorY - 0.02, 0]} receiveShadow>
        <circleGeometry args={[5.2, 48]} />
        <meshLambertMaterial color="#d9cfbf" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, spec.floorY + 0.002, 0]}>
        <ringGeometry args={[2.9, 3.7, 64]} />
        <meshBasicMaterial color="#a47a58" transparent opacity={0.13} />
      </mesh>

      {spec.bones.map((bone, index) => (
        <mesh
          key={`bone-${index}`}
          ref={(mesh) => {
            boneRefs.current[index] = mesh;
          }}
          geometry={boneGeometries[index]}
          castShadow
        >
          <meshLambertMaterial
            color={bone.color}
          />
        </mesh>
      ))}

      {spec.plates.map((plate, index) => (
        <mesh
          key={`plate-${index}`}
          ref={(mesh) => {
            plateRefs.current[index] = mesh;
          }}
        >
          <cylinderGeometry args={[0, 1, 1, 3, 1]} />
          <meshLambertMaterial color={plate.color} />
        </mesh>
      ))}

      {spec.eyes.map((eye, index) => (
        <Fragment key={`eye-${index}`}>
          <mesh
            ref={(mesh) => {
              eyeRefs.current[index] = mesh;
            }}
            geometry={JOINT_GEOMETRY}
            castShadow
          >
            <meshLambertMaterial color={eye.color} />
          </mesh>
          <mesh
            ref={(mesh) => {
              pupilRefs.current[index] = mesh;
            }}
          >
            <sphereGeometry args={[1, 12, 10]} />
            <meshBasicMaterial color={eye.pupilColor} />
          </mesh>
        </Fragment>
      ))}

      {spec.points.map((point, index) => (
        <mesh
          key={`joint-${index}`}
          ref={(mesh) => {
            jointRefs.current[index] = mesh;
          }}
          geometry={JOINT_GEOMETRY}
          castShadow
        >
          <meshLambertMaterial
            color={point.color}
          />
        </mesh>
      ))}
    </group>
  );
}

export function CreatureViewport(props: CreatureViewportProps) {
  return (
    <div className={styles.creatureCanvas}>
      <Canvas
        camera={{ position: [4.8, 2.4, 6.8], fov: 34 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
        shadows={{ type: PCFShadowMap }}
      >
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping={false}
          autoRotate={false}
          minDistance={4}
          maxDistance={12}
          target={[0, 0, 0]}
        />
        <color attach="background" args={["#f5efe4"]} />
        <fog attach="fog" args={["#f5efe4", 22, 48]} />
        <ambientLight intensity={1.25} color="#f8f0e4" />
        <hemisphereLight intensity={0.28} color="#fff2de" groundColor="#d9c7b1" />
        <directionalLight
          position={[7, 9, 5]}
          intensity={1.9}
          color="#fff1cf"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <CreatureWalker {...props} />
      </Canvas>
    </div>
  );
}
