import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { FootballMatchRuntime } from "@sagi/evolution";
import { useEffect, useMemo, useRef, useState } from "react";
import { PCFShadowMap } from "three";
import { CreatureActor3D } from "../CreatureViewport";
import { useGeneTerminal, type GeneTerminalState } from "../state";
import styles from "../GeneTerminal.module.css";

const FIELD_SURFACE_Y = -0.3;
const FIELD_LINE_Y = FIELD_SURFACE_Y + 0.022;
const FIELD_LINE_THICKNESS = 0.05;
const FOOTBALL_GAIT_SCALE = 1.45;
const TEAM_LEFT_COLOR = "#5d8fbd";
const TEAM_RIGHT_COLOR = "#b36a42";

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

export function FootballReplayPanelBody({
  terminal
}: {
  terminal: GeneTerminalState;
  mode?: "inference" | "training";
}) {
  const genome = useMemo(
    () => terminal.footballBest ? Float32Array.from(terminal.footballBest.genome) : terminal.trainingGenome,
    [terminal.footballBest, terminal.trainingGenome]
  );
  const runtimeRef = useRef<FootballMatchRuntime | null>(null);
  const [snapshot, setSnapshot] = useState<ReturnType<FootballMatchRuntime["snapshot"]> | null>(null);
  const [result, setResult] = useState<ReturnType<FootballMatchRuntime["result"]> | null>(terminal.footballPreview);

  useEffect(() => {
    if (!genome || terminal.trainingMode !== "football") {
      runtimeRef.current = null;
      setSnapshot(null);
      setResult(terminal.footballPreview);
      return;
    }
    const runtime = new FootballMatchRuntime(
      genome,
      genome,
      terminal.hiddenSize,
      {
        seed: `football-inference:${terminal.selectedCreature.id}:${terminal.generation}`,
        teamSize: terminal.footballTeamSize,
        maxTicks: terminal.footballMatchTicks
      }
    );
    runtimeRef.current = runtime;
    setSnapshot(runtime.snapshot());
    setResult(runtime.result());
  }, [genome, terminal.footballMatchTicks, terminal.footballTeamSize, terminal.generation, terminal.hiddenSize, terminal.selectedCreature.id, terminal.trainingMode, terminal.footballPreview]);

  useEffect(() => {
    if (terminal.trainingMode !== "football") return;
    const timer = window.setInterval(() => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      runtime.tick();
      const nextSnapshot = runtime.snapshot();
      if (nextSnapshot.tick >= terminal.footballMatchTicks) {
        runtime.restart(`football-loop:${terminal.selectedCreature.id}:${terminal.generation}:${Date.now()}`);
      }
      setSnapshot(runtime.snapshot());
      setResult(runtime.result());
    }, 16);
    return () => window.clearInterval(timer);
  }, [terminal.trainingMode, genome, terminal.footballMatchTicks, terminal.footballTeamSize, terminal.generation, terminal.hiddenSize, terminal.selectedCreature.id]);

  if (!genome || !snapshot || !result) {
    return (
      <div className={styles.note}>
        Start football training first, then the current best brain can be inspected on the field here.
      </div>
    );
  }
  const opponentPhenotype = makeOpponentPhenotype(terminal);

  return (
    <>
      <div className={styles.visualizerStage}>
        <div className={styles.footballOverlay}>
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
          <OrbitControls
            makeDefault
            enablePan={true}
            enableDamping={false}
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
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
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
          <mesh position={[-52.8, 1.2, 0]}>
            <boxGeometry args={[0.5, 2.4, 18]} />
            <meshLambertMaterial color="#f5efe4" />
          </mesh>
          <mesh position={[52.8, 1.2, 0]}>
            <boxGeometry args={[0.5, 2.4, 18]} />
            <meshLambertMaterial color="#f5efe4" />
          </mesh>

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
