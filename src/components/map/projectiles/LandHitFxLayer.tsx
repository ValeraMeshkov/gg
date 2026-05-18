import {
  memo,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { SHOT } from "@/game/constants";
import type { LandHitFx } from "@/game/hitEffects";
import {
  explosionVisualForWeapon,
  type FighterExplosionVisual,
} from "@/shared/fighterExplosionFx";
import { seededRandom } from "@/shared/seededRandom";
import styles from "@/components/map/styles/MapView.module.scss";

function landFxSignature(effects: readonly LandHitFx[]): string {
  return effects.map((e) => `${e.id}:${e.weapon}`).join(",");
}

/** Макс. прирост радиуса кольца относительно projR (без mapExplosionRingGrow ×10). */
const RING_GROW_BASE = 1.35;
/** Макс. длина искр относительно projR. */
const SPARK_REACH_BASE = 1.05;

type LandHitFxLayerProps = {
  effects: readonly LandHitFx[];
  projR: number;
};

function ringOpacity(local: number): number {
  return (1 - local) * 0.82;
}

function ExplosionRings({
  cx,
  cy,
  phase,
  baseR,
  grow,
  vis,
}: {
  cx: number;
  cy: number;
  phase: number;
  baseR: number;
  grow: number;
  vis: FighterExplosionVisual;
}): ReactElement[] {
  const rings: ReactElement[] = [];
  for (let k = 0; k < vis.waveCount; k++) {
    const start = k * vis.waveStagger;
    if (phase <= start) continue;
    const denom = Math.max(0.05, 1 - start);
    const local = Math.min(1, (phase - start) / denom);
    const r = baseR + local * grow;
    const op = ringOpacity(local);
    const outlineW = vis.strokeWidth + vis.outlineExtra;
    rings.push(
      <circle
        key={`o-${k}`}
        className={styles.landHitWave}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={vis.ringOutline}
        strokeWidth={outlineW}
        opacity={op * 0.95}
      />,
      <circle
        key={`r-${k}`}
        className={styles.landHitWave}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={vis.ringStroke}
        strokeWidth={vis.strokeWidth}
        opacity={op}
      />
    );
  }
  return rings;
}

function ExplosionFlash({
  cx,
  cy,
  phase,
  baseR,
  vis,
}: {
  cx: number;
  cy: number;
  phase: number;
  baseR: number;
  vis: FighterExplosionVisual;
}): ReactElement | null {
  const flashPhase = Math.min(1, phase / 0.35);
  if (flashPhase <= 0) return null;
  const flashOp = (1 - flashPhase) * 0.9;
  const r = baseR * vis.flashMul * (0.55 + flashPhase * 0.65);
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r + vis.outlineExtra * 0.35}
        fill={vis.flashOutline}
        opacity={flashOp * 0.55}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={vis.flashFill}
        opacity={flashOp}
      />
    </g>
  );
}

function ExplosionSparks({
  seed,
  cx,
  cy,
  phase,
  sparkReach,
  vis,
}: {
  seed: string;
  cx: number;
  cy: number;
  phase: number;
  sparkReach: number;
  vis: FighterExplosionVisual;
}): ReactElement[] {
  if (phase <= 0.05 || vis.sparkCount <= 0) return [];
  const rnd = seededRandom(`explode-sparks:${seed}`);
  const sparkPhase = Math.min(1, (phase - 0.05) / 0.75);
  const reach = sparkReach * sparkPhase;
  const op = (1 - sparkPhase) * 0.85;
  const items: ReactElement[] = [];

  for (let i = 0; i < vis.sparkCount; i++) {
    const angle = rnd() * Math.PI * 2;
    const len = reach * (0.45 + rnd() * 0.55);
    const x2 = cx + Math.cos(angle) * len;
    const y2 = cy + Math.sin(angle) * len;
    const w = vis.variant === "burst" ? 2.2 : 1.4;

    if (vis.variant === "toxic") {
      const dotR = 1.2 + rnd() * 1.4;
      items.push(
        <circle
          key={i}
          cx={x2}
          cy={y2}
          r={dotR + 0.8}
          fill={vis.ringOutline}
          opacity={op * 0.7}
        />,
        <circle
          key={`d-${i}`}
          cx={x2}
          cy={y2}
          r={dotR}
          fill={vis.sparkStroke}
          opacity={op}
        />
      );
      continue;
    }

    if (vis.variant === "arcane") {
      const starR = 1.6 + rnd() * 1.2;
      items.push(
        <circle
          key={`o-${i}`}
          cx={x2}
          cy={y2}
          r={starR + 1}
          fill={vis.ringOutline}
          opacity={op * 0.65}
        />,
        <circle
          key={i}
          cx={x2}
          cy={y2}
          r={starR}
          fill={vis.sparkStroke}
          opacity={op}
        />
      );
      continue;
    }

    items.push(
      <line
        key={`o-${i}`}
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={vis.ringOutline}
        strokeWidth={w + 1.2}
        strokeLinecap="round"
        opacity={op * 0.75}
      />,
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={vis.sparkStroke}
        strokeWidth={w}
        strokeLinecap="round"
        opacity={op}
      />
    );
  }
  return items;
}

function WaveBurst({
  effect,
  projR,
  phase,
}: {
  effect: LandHitFx;
  projR: number;
  phase: number;
}): ReactElement {
  const cx = effect.x;
  const cy = effect.y;
  const vis = explosionVisualForWeapon(effect.weapon);
  const baseR = projR * 0.72;
  const grow = projR * RING_GROW_BASE * vis.growMul;
  const sparkReach = projR * SPARK_REACH_BASE * vis.sparkReach;

  return (
    <g className={styles.landHitWaveBurst}>
      <ExplosionFlash cx={cx} cy={cy} phase={phase} baseR={baseR} vis={vis} />
      <ExplosionRings
        cx={cx}
        cy={cy}
        phase={phase}
        baseR={baseR}
        grow={grow}
        vis={vis}
      />
      <ExplosionSparks
        seed={effect.id}
        cx={cx}
        cy={cy}
        phase={phase}
        sparkReach={sparkReach}
        vis={vis}
      />
    </g>
  );
}

export const LandHitFxLayer = memo(function LandHitFxLayer({
  effects,
  projR,
}: LandHitFxLayerProps): ReactElement {
  const effRef = useRef(effects);
  effRef.current = effects;
  const [now, setNow] = useState(() => performance.now());
  const sig = landFxSignature(effects);

  useEffect(() => {
    if (sig === "") return;
    let raf = 0;
    let stopped = false;
    const step = () => {
      if (stopped) return;
      const list = effRef.current;
      const t = performance.now();
      if (!list.some((e) => t - e.start < SHOT.explosionDurationMs)) return;
      setNow(t);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [sig]);

  return (
    <g aria-hidden>
      {effects.map((e) => {
        const phase = Math.min(
          1,
          (now - e.start) / SHOT.explosionDurationMs
        );
        return (
          <WaveBurst
            key={e.id}
            effect={e}
            projR={projR}
            phase={phase}
          />
        );
      })}
    </g>
  );
});
