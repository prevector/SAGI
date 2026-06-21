import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { FootballMatchRuntime } from "@sagi/evolution";
import { useEffect, useMemo, useRef, useState } from "react";
import { PCFShadowMap, Vector3 } from "three";
import { CreatureActor3D } from "../CreatureViewport";
import { useGeneTerminal, type GeneTerminalState } from "../state";
import styles from "../GeneTerminal.module.css";

const FIELD_SURFACE_Y = -0.3;
const FIELD_LINE_Y = FIELD_SURFACE_Y + 0.022;
const FIELD_LINE_THICKNESS = 0.05;
const FOOTBALL_GAIT_SCALE = 1.45;
const GOAL_WIDTH = 18;
const GOAL_HEIGHT = 4.6;
const GOAL_DEPTH = 4.4;
const TEAM_LEFT_COLOR = "#5d8fbd";
const TEAM_RIGHT_COLOR = "#b36a42";
const CAMERA_TARGET = new Vector3();
const CAMERA_POSITION = new Vector3();
const CAMERA_LOOK = new Vector3();

function ActionCamera({
  snapshot,
  active
}: {
  snapshot: ReturnType<FootballMatchRuntime["snapshot"]>;
  active: boolean;
}) {
  useFrame((state) => {
    if (!active) {
      return;
    }

    const ballX = snapshot.ball.x - 55;
    const ballZ = snapshot.ball.y - 35;
    const allPlayers = [...snapshot.teams[0], ...snapshot.teams[1]];
    const nearestPlayers = [...allPlayers]
      .sort((left, right) => {
        const leftDx = left.x - snapshot.ball.x;
        const leftDy = left.y - snapshot.ball.y;
        const rightDx = right.x - snapshot.ball.x;
        const rightDy = right.y - snapshot.ball.y;
        return leftDx * leftDx + leftDy * leftDy - (rightDx * rightDx + rightDy * rightDy);
      })
      .slice(0, 4);

    let clusterX = ballX * 2.2;
    let clusterZ = ballZ * 2.2;
    let count = 2.2;
    for (const player of nearestPlayers) {
      clusterX += player.x - 55;
      clusterZ += player.y - 35;
      count += 1;
    }
    clusterX /= count;
    clusterZ /= count;

    const goalBias = Math.max(-1, Math.min(1, ballX / 55));
    CAMERA_TARGET.set(clusterX, 0.6, clusterZ);
    CAMERA_POSITION.set(
      clusterX - goalBias * 10,
      33 + Math.abs(goalBias) * 4.5,
      clusterZ + 36
    );
    CAMERA_LOOK.set(clusterX + goalBias * 6.5, 0.2, clusterZ - 7.5);

    state.camera.position.lerp(CAMERA_POSITION, 0.024);
    const currentLook = CAMERA_TARGET.copy(state.camera.getWorldDirection(CAMERA_TARGET)).multiplyScalar(12).add(state.camera.position);
    currentLook.lerp(CAMERA_LOOK, 0.04);
    state.camera.lookAt(currentLook);
  });

  return null;
}

function makeOpponentPhenotype(terminal: GeneTerminalState) {
  const phenotype = terminal.selectedCreature.phenotype;
  return {
    ...phenotype,
    bodyFrom: phenotype.bodyTo,
    bodyTo: phenotype.cool,
    crest: phenotype.accent,
    limb: phenotype.limb
  };
}

function FootballGoal({
  x,
  direction
}: {
  x: number;
  direction: -1 | 1;
}) {
  const postRadius = 0.18;
  const netLineThickness = 0.05;
  const sideZ = GOAL_WIDTH / 2;
  const backX = x + direction * GOAL_DEPTH;
  const centerX = x + direction * (GOAL_DEPTH * 0.5);
  const baseY = FIELD_SURFACE_Y + postRadius * 0.5;
  const topY = FIELD_SURFACE_Y + GOAL_HEIGHT;
  const midY = FIELD_SURFACE_Y + GOAL_HEIGHT * 0.5;
  const netColor = "#dcd8cc";
  const frameColor = "#f4efe6";
  const netOpacity = 0.68;
  const netColumns = [-0.72, -0.36, 0, 0.36, 0.72];
  const netRows = [0.24, 0.44, 0.64, 0.84];

  return (
    <group>
      <mesh position={[x, FIELD_SURFACE_Y + GOAL_HEIGHT * 0.5, -sideZ]} castShadow>
        <boxGeometry args={[postRadius, GOAL_HEIGHT, postRadius]} />
        <meshLambertMaterial color={frameColor} />
      </mesh>
      <mesh position={[x, FIELD_SURFACE_Y + GOAL_HEIGHT * 0.5, sideZ]} castShadow>
        <boxGeometry args={[postRadius, GOAL_HEIGHT, postRadius]} />
        <meshLambertMaterial color={frameColor} />
      </mesh>
      <mesh position={[x, topY, 0]} castShadow>
        <boxGeometry args={[postRadius, postRadius, GOAL_WIDTH + postRadius]} />
        <meshLambertMaterial color={frameColor} />
      </mesh>

      <mesh position={[backX, midY, -sideZ]} castShadow>
        <boxGeometry args={[postRadius, GOAL_HEIGHT, postRadius]} />
        <meshLambertMaterial color={frameColor} />
      </mesh>
      <mesh position={[backX, midY, sideZ]} castShadow>
        <boxGeometry args={[postRadius, GOAL_HEIGHT, postRadius]} />
        <meshLambertMaterial color={frameColor} />
      </mesh>
      <mesh position={[backX, topY, 0]} castShadow>
        <boxGeometry args={[postRadius, postRadius, GOAL_WIDTH + postRadius]} />
        <meshLambertMaterial color={frameColor} />
      </mesh>
      <mesh position={[centerX, topY, -sideZ]}>
        <boxGeometry args={[GOAL_DEPTH, netLineThickness, netLineThickness]} />
        <meshBasicMaterial color={netColor} transparent opacity={netOpacity} />
      </mesh>
      <mesh position={[centerX, topY, sideZ]}>
        <boxGeometry args={[GOAL_DEPTH, netLineThickness, netLineThickness]} />
        <meshBasicMaterial color={netColor} transparent opacity={netOpacity} />
      </mesh>
      <mesh position={[centerX, baseY, -sideZ]}>
        <boxGeometry args={[GOAL_DEPTH, netLineThickness, netLineThickness]} />
        <meshBasicMaterial color={netColor} transparent opacity={netOpacity * 0.75} />
      </mesh>
      <mesh position={[centerX, baseY, sideZ]}>
        <boxGeometry args={[GOAL_DEPTH, netLineThickness, netLineThickness]} />
        <meshBasicMaterial color={netColor} transparent opacity={netOpacity * 0.75} />
      </mesh>

      {netColumns.map((t) => (
        <mesh key={`goal-net-back-v-${x}-${t}`} position={[backX, midY, t * sideZ]}>
          <boxGeometry args={[netLineThickness, GOAL_HEIGHT, netLineThickness]} />
          <meshBasicMaterial color={netColor} transparent opacity={netOpacity} />
        </mesh>
      ))}
      {netRows.map((t) => (
        <mesh key={`goal-net-back-h-${x}-${t}`} position={[backX, FIELD_SURFACE_Y + GOAL_HEIGHT * t, 0]}>
          <boxGeometry args={[netLineThickness, netLineThickness, GOAL_WIDTH]} />
          <meshBasicMaterial color={netColor} transparent opacity={netOpacity} />
        </mesh>
      ))}
    </group>
  );
}

export function FootballReplayPanelBody({
  terminal
}: {
  terminal: GeneTerminalState;
  mode?: "inference" | "training";
}) {
  const genome = useMemo(() => (
    terminal.footballBest ? Float32Array.from(terminal.footballBest.genome) : null
  ), [terminal.footballBest]);
  const runtimeRef = useRef<FootballMatchRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<ReturnType<FootballMatchRuntime["snapshot"]> | null>(null);
  const [result, setResult] = useState<ReturnType<FootballMatchRuntime["result"]> | null>(null);
  const [actionCamera, setActionCamera] = useState(true);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!genome || terminal.trainingMode !== "football") {
      runtimeRef.current = null;
      setSnapshot(null);
      setResult(null);
      return;
    }
    const runtime = new FootballMatchRuntime(
      genome,
      genome,
      terminal.hiddenSize,
      {
        seed: `football-inference:${terminal.selectedCreature.id}:${terminal.footballBest?.updatedAt ?? "best"}`,
        teamSize: terminal.footballBest?.teamSize ?? terminal.footballTeamSize,
        maxTicks: terminal.footballBest?.matchTicks ?? terminal.footballMatchTicks
      }
    );
    runtimeRef.current = runtime;
    setSnapshot(runtime.snapshot());
    setResult(runtime.result());
  }, [genome, terminal.hiddenSize, terminal.selectedCreature.id, terminal.trainingMode, terminal.footballBest]);

  useEffect(() => {
    if (terminal.trainingMode !== "football") return;
    const timer = window.setInterval(() => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      runtime.tick();
      const nextSnapshot = runtime.snapshot();
      const maxTicks = terminal.footballBest?.matchTicks ?? terminal.footballMatchTicks;
      if (nextSnapshot.tick >= maxTicks) {
        runtime.restart(`football-loop:${terminal.selectedCreature.id}:${terminal.footballBest?.updatedAt ?? "best"}`);
      }
      setSnapshot(runtime.snapshot());
      setResult(runtime.result());
    }, 16);
    return () => window.clearInterval(timer);
  }, [terminal.trainingMode, genome, terminal.footballBest, terminal.footballMatchTicks, terminal.selectedCreature.id]);

  if (!genome || !snapshot || !result) {
    return (
      <div className={styles.note}>
        Train football first, then the global best football brain for this creature will loop here.
      </div>
    );
  }
  const opponentPhenotype = makeOpponentPhenotype(terminal);

  return (
    <>
      <div className={styles.visualizerStage}>
        <div className={styles.footballOverlay}>
          <button
            type="button"
            className={styles.footballOverlayButton}
            aria-label={actionCamera ? "Disable active camera" : "Enable active camera"}
            title={actionCamera ? "Disable active camera" : "Enable active camera"}
            onClick={() => setActionCamera((value) => !value)}
          >
            {actionCamera ? "◎" : "○"}
          </button>
          <span>{result.score[0]}:{result.score[1]}</span>
          <span>{result.fitness[0].toFixed(1)} / {result.fitness[1].toFixed(1)}</span>
          <span>{snapshot.ball.x.toFixed(0)}, {snapshot.ball.y.toFixed(0)}</span>
          <span>{result.winner === -1 ? "draw" : `team ${result.winner + 1}`}</span>
        </div>
        <Canvas
          camera={{ position: [0, 44, 46], fov: 34 }}
          dpr={[1, 1.8]}
          gl={{ antialias: true, alpha: true }}
          shadows={{ type: PCFShadowMap }}
        >
          <ActionCamera snapshot={snapshot} active={actionCamera} />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={!actionCamera}
            enablePan={true}
            enableDamping={true}
            autoRotate={false}
            minDistance={24}
            maxDistance={120}
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2.02}
          />
          <color attach="background" args={["#f5efe4"]} />
          <fog attach="fog" args={["#f5efe4", 180, 320]} />
          <ambientLight intensity={1.25} color="#f8f0e4" />
          <hemisphereLight intensity={0.28} color="#fff2de" groundColor="#355847" />
          <directionalLight
            position={[26, 38, 20]}
            intensity={1.8}
            color="#fff1cf"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-left={-80}
            shadow-camera-right={80}
            shadow-camera-top={80}
            shadow-camera-bottom={-80}
            shadow-camera-near={1}
            shadow-camera-far={140}
          />

          <mesh rotation-x={-Math.PI / 2} position={[0, -0.32, 0]} receiveShadow>
            <planeGeometry args={[110, 70]} />
            <meshLambertMaterial color="#d9cfbf" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, FIELD_SURFACE_Y, 0]} receiveShadow>
            <planeGeometry args={[104, 64]} />
            <meshLambertMaterial color="#8fb091" />
          </mesh>
          <mesh position={[0, FIELD_LINE_Y, -32]}>
            <boxGeometry args={[104, FIELD_LINE_THICKNESS, 0.18]} />
            <meshBasicMaterial color="#f5f1e8" />
          </mesh>
          <mesh position={[0, FIELD_LINE_Y, 32]}>
            <boxGeometry args={[104, FIELD_LINE_THICKNESS, 0.18]} />
            <meshBasicMaterial color="#f5f1e8" />
          </mesh>
          <mesh position={[-52, FIELD_LINE_Y, 0]}>
            <boxGeometry args={[0.18, FIELD_LINE_THICKNESS, 64]} />
            <meshBasicMaterial color="#f5f1e8" />
          </mesh>
          <mesh position={[52, FIELD_LINE_Y, 0]}>
            <boxGeometry args={[0.18, FIELD_LINE_THICKNESS, 64]} />
            <meshBasicMaterial color="#f5f1e8" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, FIELD_LINE_Y + 0.001, 0]}>
            <ringGeometry args={[8.7, 9.1, 64]} />
            <meshBasicMaterial color="#f5f1e8" />
          </mesh>
          <mesh position={[0, FIELD_LINE_Y, 0]}>
            <boxGeometry args={[0.18, FIELD_LINE_THICKNESS, 64]} />
            <meshBasicMaterial color="#f5f1e8" />
          </mesh>
          <FootballGoal x={-52} direction={-1} />
          <FootballGoal x={52} direction={1} />

          {snapshot.teams[0].map((player, index) => (
            <CreatureActor3D
              key={`football-a-${index}`}
              gene={terminal.selectedGene}
              phenotype={terminal.selectedCreature.phenotype}
              generation={terminal.generation}
              status="running"
              worldPosition={[player.x - 55, FIELD_SURFACE_Y, player.y - 35]}
              worldHeading={player.heading}
              worldGroundY={FIELD_SURFACE_Y}
              showFloor={false}
              gaitScale={FOOTBALL_GAIT_SCALE}
              teamColor={TEAM_LEFT_COLOR}
            />
          ))}

          {snapshot.teams[1].map((player, index) => (
            <CreatureActor3D
              key={`football-b-${index}`}
              gene={terminal.selectedGene}
              phenotype={opponentPhenotype}
              generation={terminal.generation}
              status="running"
              worldPosition={[player.x - 55, FIELD_SURFACE_Y, player.y - 35]}
              worldHeading={player.heading}
              worldGroundY={FIELD_SURFACE_Y}
              showFloor={false}
              gaitScale={FOOTBALL_GAIT_SCALE}
              teamColor={TEAM_RIGHT_COLOR}
            />
          ))}

          <mesh position={[snapshot.ball.x - 55, 0.95, snapshot.ball.y - 35]} castShadow>
            <sphereGeometry args={[1.05, 18, 16]} />
            <meshLambertMaterial color="#f7f0e6" />
          </mesh>
        </Canvas>
      </div>
    </>
  );
}

export function FootballInferencePanel() {
  const terminal = useGeneTerminal();
  return <FootballReplayPanelBody terminal={terminal} mode="inference" />;
}
