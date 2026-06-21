import { GruModel, type GruTraceStep } from "@sagi/evolution";
import type { IDockviewPanelProps } from "dockview";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatInt } from "../../../lib/format";
import { useReducedMotion } from "../../../features/session/visual/scene/useReducedMotion";
import { Readout } from "../components";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

function topPredictions(step: GruTraceStep, count = 4) {
  return Array.from(step.probabilities)
    .map((probability, index) => ({ index, probability }))
    .sort((left, right) => right.probability - left.probability)
    .slice(0, count);
}

function TrainingSignalCanvas({
  vocab,
  tokens,
  step,
  stepIndex,
  sampleIndex,
  running,
  reducedMotion
}: {
  vocab: readonly string[];
  tokens: Uint16Array;
  step: GruTraceStep;
  stepIndex: number;
  sampleIndex: number;
  running: boolean;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const draw = useMemo(() => {
    const ranked = topPredictions(step, 4);
    const hiddenValues = Array.from(step.hidden);
    const columns = Math.max(3, Math.min(5, Math.ceil(Math.sqrt(hiddenValues.length))));
    const rows = Math.max(2, Math.ceil(hiddenValues.length / columns));

    return (time: number, width: number, height: number, ctx: CanvasRenderingContext2D) => {
      const t = time * 0.001;
      ctx.clearRect(0, 0, width, height);

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "rgba(242,238,230,0.98)");
      bg.addColorStop(1, "rgba(229,222,210,0.96)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(54,47,40,0.08)";
      ctx.lineWidth = 1;
      for (let y = 18; y < height; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const left = Math.max(28, width * 0.08);
      const right = width - Math.max(28, width * 0.08);
      const centerX = width * 0.52;
      const centerY = height * 0.52;
      const orbitX = width * 0.18;
      const orbitY = height * 0.22;

      const activeTokenIndex = Math.min(stepIndex, Math.max(0, tokens.length - 1));
      const futureTokenIndex = Math.min(stepIndex + 1, Math.max(0, tokens.length - 1));

      ctx.font = '12px var(--font-mono), "Geist Mono", monospace';
      ctx.textBaseline = "middle";

      Array.from(tokens).forEach((token, index) => {
        const label = vocab[token] ?? "?";
        const distance = index - activeTokenIndex;
        const proximity = Math.max(0, 1 - Math.abs(distance) * 0.18);
        const drift = running ? Math.sin(t * 7 + index * 0.9) * 10 : 0;
        const spread = index / Math.max(tokens.length - 1, 1);
        const x = left + (right - left) * spread;
        const y = centerY + Math.sin(t * 2.2 + index * 0.7) * 14 + drift;

        ctx.save();
        ctx.globalAlpha = 0.26 + proximity * 0.58;
        ctx.fillStyle =
          index === activeTokenIndex ? "rgba(23,196,196,0.2)" :
          index === futureTokenIndex ? "rgba(240,120,61,0.16)" :
          "rgba(255,255,255,0.3)";
        ctx.strokeStyle =
          index === activeTokenIndex ? "rgba(23,196,196,0.42)" :
          index === futureTokenIndex ? "rgba(240,120,61,0.36)" :
          "rgba(54,47,40,0.08)";
        const w = ctx.measureText(label).width + 14;
        const h = 20;
        ctx.beginPath();
        ctx.rect(x - w / 2, y - h / 2, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(42,38,34,0.92)";
        ctx.fillText(label, x - w / 2 + 7, y);
        ctx.restore();
      });

      const nodePositions = hiddenValues.map((value, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = centerX - orbitX / 2 + (col / Math.max(columns - 1, 1)) * orbitX;
        const y = centerY - orbitY / 2 + (row / Math.max(rows - 1, 1)) * orbitY;
        return { x, y, value };
      });

      for (let index = 0; index < nodePositions.length; index += 1) {
        const source = nodePositions[index];
        const next = nodePositions[index + columns];
        if (next) {
          const alpha = 0.08 + (Math.abs(source.value) + Math.abs(next.value)) * 0.1;
          ctx.strokeStyle = source.value >= 0 ? `rgba(23,196,196,${alpha})` : `rgba(240,120,61,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
        const rightNode = colWrap(nodePositions, index, columns);
        if (rightNode) {
          const alpha = 0.06 + (Math.abs(source.value) + Math.abs(rightNode.value)) * 0.08;
          ctx.strokeStyle = `rgba(54,47,40,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(rightNode.x, rightNode.y);
          ctx.stroke();
        }
      }

      nodePositions.forEach(({ x, y, value }, index) => {
        const amplitude = Math.abs(value);
        const radius = 6 + amplitude * 10 + (running ? Math.sin(t * 10 + index) * 1.5 : 0);
        ctx.beginPath();
        ctx.fillStyle = value >= 0 ? "rgba(23,196,196,0.8)" : "rgba(240,120,61,0.74)";
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,0.46)";
        ctx.arc(x, y, Math.max(radius - 3.5, 2), 0, Math.PI * 2);
        ctx.stroke();
      });

      ranked.forEach(({ index, probability }, rank) => {
        const label = vocab[index] ?? "?";
        const x = width * 0.78 + (running ? Math.sin(t * 6 + rank) * 12 : 0);
        const y = height * 0.24 + rank * 42 + (running ? Math.cos(t * 8 + rank) * 6 : 0);
        const w = ctx.measureText(label).width + 20;
        ctx.fillStyle = rank === 0 ? "rgba(23,196,196,0.2)" : "rgba(255,255,255,0.34)";
        ctx.strokeStyle = rank === 0 ? "rgba(23,196,196,0.46)" : "rgba(54,47,40,0.12)";
        ctx.fillRect(x - w / 2, y - 13, w, 26);
        ctx.strokeRect(x - w / 2, y - 13, w, 26);
        ctx.fillStyle = "rgba(42,38,34,0.94)";
        ctx.fillText(label, x - w / 2 + 8, y);
        ctx.fillStyle = rank === 0 ? "rgba(23,196,196,0.9)" : "rgba(110,140,166,0.9)";
        ctx.fillRect(x - w / 2, y + 16, Math.max(8, probability * 96), 4);
      });

      ctx.fillStyle = "rgba(42,38,34,0.7)";
      ctx.fillText(`sample ${sampleIndex + 1}`, 18, 22);
      ctx.fillText(`step ${stepIndex + 1}/${Math.max(tokens.length - 1, 1)}`, width - 104, 22);
      ctx.fillText("hidden field", centerX - 28, centerY - orbitY / 2 - 18);
      ctx.fillText("next-token race", width * 0.72, height * 0.16);

      if (!running || reducedMotion) {
        ctx.fillStyle = "rgba(42,38,34,0.54)";
        ctx.fillText(reducedMotion ? "reduced motion" : "paused frame", 18, height - 18);
      }
    };
  }, [reducedMotion, running, sampleIndex, step, stepIndex, tokens, vocab]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let raf = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(320, rect.width);
      height = Math.max(260, rect.height);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now(), width, height, context);
    };

    const render = (now: number) => {
      draw(now, width, height, context);
      if (running && !reducedMotion) {
        raf = window.requestAnimationFrame(render);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    if (running && !reducedMotion) {
      raf = window.requestAnimationFrame(render);
    }

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [draw, reducedMotion, running]);

  return (
    <div className={styles.visualizerStage} ref={wrapRef}>
      <canvas className={styles.visualizerCanvas} ref={canvasRef} aria-hidden="true" />
    </div>
  );
}

function colWrap(nodes: Array<{ x: number; y: number; value: number }>, index: number, columns: number) {
  const isRightEdge = (index + 1) % columns === 0;
  if (isRightEdge) return null;
  return nodes[index + 1] ?? null;
}

function FootballTrainingVisualizer({
  terminal,
  running,
  reducedMotion
}: {
  terminal: ReturnType<typeof useGeneTerminal>;
  running: boolean;
  reducedMotion: boolean;
}) {
  const preview = terminal.footballPreview;
  return (
    <section className={`${styles.panel} ${styles.panelVisualizer}`}>
      <div className={styles.trainingHeader}>
        <div>
          <h2>Training visualizer</h2>
          <span className={styles.sectionLabel}>football training lives in inference</span>
        </div>
      </div>
      <div className={styles.note}>
        Use the `INFERENCE` window in football mode to inspect the current best brain playing on the field. The training visualizer stays focused on the token task.
      </div>
      {preview ? (
        <div className={styles.visualizerMeta}>
          <span>latest score {preview.score[0]}:{preview.score[1]}</span>
          <span>{formatInt(terminal.footballTeamSize)} players per side</span>
          <span>{formatInt(terminal.footballMatchTicks)} ticks per match</span>
        </div>
      ) : null}
    </section>
  );
}

function LanguageTrainingVisualizer({
  terminal,
  running,
  reducedMotion
}: {
  terminal: ReturnType<typeof useGeneTerminal>;
  running: boolean;
  reducedMotion: boolean;
}) {
  const dataset = terminal.tokenDataset;
  const [playhead, setPlayhead] = useState(0);

  const traces = useMemo(() => {
    if (!terminal.trainingGenome) return [];
    const model = new GruModel({ vocabSize: dataset.vocab.length, hiddenSize: terminal.hiddenSize });
    return dataset.samples.map((sample) => ({
      sample,
      trace: model.traceSequence(terminal.trainingGenome!, sample.tokens)
    }));
  }, [dataset, terminal.hiddenSize, terminal.trainingGenome]);

  useEffect(() => {
    setPlayhead(0);
  }, [terminal.selectedCreature.id, terminal.hiddenSize, terminal.trainingGenome]);

  useEffect(() => {
    if (reducedMotion || traces.length === 0) return;
    const stepsPerSample = Math.max(...traces.map((item) => item.trace.steps.length), 1);
    const delay = running ? 80 : 180;
    const timer = window.setInterval(() => {
      setPlayhead((value) => (value + 1) % (traces.length * stepsPerSample));
    }, delay);
    return () => window.clearInterval(timer);
  }, [reducedMotion, running, traces]);

  const frame = useMemo(() => {
    if (traces.length === 0) return null;
    if (reducedMotion) {
      const current = traces[Math.min(terminal.selectedSampleIndex, traces.length - 1)] ?? traces[0];
      const stepIndex = Math.min(terminal.inferenceStepIndex, Math.max(0, current.trace.steps.length - 1));
      return {
        sampleIndex: Math.min(terminal.selectedSampleIndex, traces.length - 1),
        sample: current.sample,
        trace: current.trace,
        stepIndex,
        step: current.trace.steps[stepIndex] ?? current.trace.steps[0] ?? null
      };
    }

    const stepsPerSample = Math.max(...traces.map((item) => item.trace.steps.length), 1);
    const sampleIndex = Math.floor(playhead / stepsPerSample) % traces.length;
    const current = traces[sampleIndex] ?? traces[0];
    const stepIndex = playhead % Math.max(current.trace.steps.length, 1);
    return {
      sampleIndex,
      sample: current.sample,
      trace: current.trace,
      stepIndex,
      step: current.trace.steps[stepIndex] ?? current.trace.steps[0] ?? null
    };
  }, [playhead, reducedMotion, terminal.inferenceStepIndex, terminal.selectedSampleIndex, traces]);

  if (!frame?.step) {
    return (
      <section className={`${styles.panel} ${styles.panelVisualizer}`}>
        <div className={styles.trainingHeader}>
          <div>
            <h2>Training visualizer</h2>
            <span className={styles.sectionLabel}>live token inference field</span>
          </div>
        </div>
        <div className={styles.note}>Train the current creature first, then this window will render the GRU activity field.</div>
      </section>
    );
  }

  const ranked = topPredictions(frame.step, 4);
  const best = ranked[0];
  const expectedLabel = dataset.vocab[frame.step.expected] ?? "?";
  const predictedLabel = dataset.vocab[frame.step.predicted] ?? "?";

  return (
    <section className={`${styles.panel} ${styles.panelVisualizer}`}>
      <div className={styles.trainingHeader}>
        <div>
          <h2>Training visualizer</h2>
          <span className={styles.sectionLabel}>token field · hidden state · next-token race</span>
        </div>
      </div>

      <div className={styles.marketGrid}>
        <Readout label="sample" value={formatInt(frame.sampleIndex + 1)} />
        <Readout label="step" value={`${formatInt(frame.stepIndex + 1)} / ${formatInt(frame.trace.steps.length)}`} />
        <Readout label="expected" value={expectedLabel} />
        <Readout label="predicted" value={predictedLabel} tone={frame.step.predicted === frame.step.expected ? "good" : "warn"} />
      </div>

      <TrainingSignalCanvas
        vocab={dataset.vocab}
        tokens={frame.sample.tokens}
        step={frame.step}
        stepIndex={frame.stepIndex}
        sampleIndex={frame.sampleIndex}
        running={running}
        reducedMotion={reducedMotion}
      />

      <div className={styles.visualizerHud}>
        <div className={styles.tokenStrip}>
          {ranked.map(({ index, probability }, rank) => (
            <span key={index} className={`${styles.tokenChip} ${rank === 0 ? styles.tokenChipActive : ""}`}>
              {dataset.vocab[index]} {(probability * 100).toFixed(0)}%
            </span>
          ))}
        </div>
        <div className={styles.visualizerMeta}>
          <span>best candidate: {dataset.vocab[best?.index ?? frame.step.predicted] ?? predictedLabel}</span>
          <span>sample accuracy: {(frame.trace.accuracy * 100).toFixed(0)}%</span>
          <span>{running ? "live sweep" : reducedMotion ? "static frame" : "idle scan"}</span>
        </div>
      </div>
    </section>
  );
}

export function TrainingVisualizerPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const reducedMotion = useReducedMotion();
  const running = terminal.status === "running";
  return terminal.trainingMode === "football"
    ? <FootballTrainingVisualizer terminal={terminal} running={running} reducedMotion={reducedMotion} />
    : <LanguageTrainingVisualizer terminal={terminal} running={running} reducedMotion={reducedMotion} />;
}
