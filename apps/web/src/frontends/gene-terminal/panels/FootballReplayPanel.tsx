import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { FootballMatchRuntime, footballInputLabels } from "@sagi/evolution";
import { useEffect, useRef, useState } from "react";
import { PCFShadowMap } from "three";
import { formatInt } from "../../../lib/format";
import { CreatureActor3D } from "../CreatureViewport";
import { Readout } from "../components";
import { useGeneTerminal, type GeneTerminalState } from "../state";
import styles from "../GeneTerminal.module.css";

const FOOTBALL_INPUT_LIST = footballInputLabels().join(" · ");
const FOOTBALL_TICKS_PER_SECOND = 24;

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
  terminal,
  mode = "inference"
}: {
  terminal: GeneTerminalState;
  mode?: "inference" | "training";
}) {
  const genome = terminal.trainingGenome;
  const runtimeRef = useRef<FootballMatchRuntime | null>(null);
  const [matchSerial, setMatchSerial] = useState(0);
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
        seed: `football-inference:${terminal.selectedCreature.id}:${terminal.generation}:${matchSerial}`,
        teamSize: terminal.footballTeamSize,
        maxTicks: terminal.footballMatchTicks
      }
    );
    runtimeRef.current = runtime;
    setSnapshot(runtime.snapshot());
    setResult(runtime.result());
  }, [genome, matchSerial, terminal.footballMatchTicks, terminal.footballTeamSize, terminal.generation, terminal.hiddenSize, terminal.selectedCreature.id, terminal.trainingMode, terminal.footballPreview]);

  useEffect(() => {
    if (terminal.trainingMode !== "football") return;
    const timer = window.setInterval(() => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      runtime.tick();
      setSnapshot(runtime.snapshot());
      setResult(runtime.result());
    }, 32);
    return () => window.clearInterval(timer);
  }, [terminal.trainingMode, matchSerial, genome, terminal.footballMatchTicks, terminal.footballTeamSize, terminal.generation, terminal.hiddenSize, terminal.selectedCreature.id]);

  if (!genome || !snapshot || !result) {
    return (
      <div className={styles.note}>
        {mode === "inference"
          ? "Start football training first, then the current best brain can be inspected on the field here."
          : "No football replay is available yet."}
      </div>
    );
  }
  const opponentPhenotype = makeOpponentPhenotype(terminal);

  return (
    <>
      <div className={styles.marketGrid}>
        <Readout label="score" value={`${result.score[0]} : ${result.score[1]}`} />
        <Readout label="fitness" value={`${result.fitness[0].toFixed(1)} / ${result.fitness[1].toFixed(1)}`} />
        <Readout label="possession" value={`${formatInt(result.possessionTicks[0])} / ${formatInt(result.possessionTicks[1])}`} />
        <Readout label="winner" value={result.winner === -1 ? "draw" : `team ${result.winner + 1}`} />
        {mode === "inference" ? <button onClick={() => setMatchSerial((value) => value + 1)}>NEW GAME</button> : null}
      </div>

      <div className={styles.visualizerStage}>
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
          <mesh rotation-x={-Math.PI / 2} position={[0, -0.3, 0]} receiveShadow>
            <planeGeometry args={[104, 64]} />
            <meshLambertMaterial color="#8fb091" />
          </mesh>
          <mesh position={[0, -0.285, 0]}>
            <boxGeometry args={[104, 0.02, 64]} />
            <meshBasicMaterial wireframe color="#f5f1e8" />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position={[0, -0.279, 0]}>
            <ringGeometry args={[8.7, 9.1, 64]} />
            <meshBasicMaterial color="#f5f1e8" />
          </mesh>
          <mesh position={[0, -0.28, 0]}>
            <boxGeometry args={[0.18, 0.04, 64]} />
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
              worldPosition={[player.x - 55, 0, player.y - 35]}
              worldHeading={player.heading}
              showFloor={false}
            />
          ))}

          {snapshot.teams[1].map((player, index) => (
            <CreatureActor3D
              key={`football-b-${index}`}
              gene={terminal.selectedGene}
              phenotype={opponentPhenotype}
              generation={terminal.generation}
              status="running"
              worldPosition={[player.x - 55, 0, player.y - 35]}
              worldHeading={player.heading}
              showFloor={false}
            />
          ))}

          <mesh position={[snapshot.ball.x - 55, 0.95, snapshot.ball.y - 35]} castShadow>
            <sphereGeometry args={[1.05, 18, 16]} />
            <meshLambertMaterial color="#f7f0e6" />
          </mesh>
        </Canvas>
      </div>

      <div className={styles.visualizerMeta}>
        <span>{formatInt(terminal.footballTeamSize)} players per side</span>
        <span>{formatInt(terminal.footballMatchTicks)} ticks per match</span>
        <span>{(terminal.footballMatchTicks / FOOTBALL_TICKS_PER_SECOND).toFixed(1)}s per match</span>
        <span>tick {formatInt(snapshot.tick)}</span>
        <span>{snapshot.tick >= terminal.footballMatchTicks ? "match finished" : mode === "inference" ? "best brain live sim" : "training replay"}</span>
      </div>
      <div className={styles.note}>
        Inputs: {FOOTBALL_INPUT_LIST}
      </div>
    </>
  );
}

export function FootballInferencePanel() {
  const terminal = useGeneTerminal();
  return <FootballReplayPanelBody terminal={terminal} mode="inference" />;
}
