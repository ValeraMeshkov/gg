import {
  memo,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { SHOT } from "../../game/constants";
import type { LandHitFx } from "../../game/hitEffects";
import { LAND_HIT_FX_COLOR } from "../../game/hitEffects";
import type { GameMap } from "../../game/maps";
import { mapExplosionRingGrow } from "../../game/maps/mapScale";
import styles from "../MapView.module.scss";

/** Меньше колец — меньше узлов SVG и проще композитинг. */
const WAVE_COUNT = 2;
const WAVE_STAGGER = 0.18;

function landFxSignature(effects: readonly LandHitFx[]): string {
  return effects.map((e) => e.id).join(",");
}

type LandHitFxLayerProps = {
  map: GameMap;
  effects: readonly LandHitFx[];
  projR: number;
};

function WaveBurst({
  effect,
  map,
  projR,
  phase,
}: {
  effect: LandHitFx;
  map: GameMap;
  projR: number;
  phase: number;
}): ReactElement {
  const cx = effect.x;
  const cy = effect.y;
  const grow = mapExplosionRingGrow(map) * 0.48;
  const baseR = projR * 0.85;

  const rings: ReactElement[] = [];
  for (let k = 0; k < WAVE_COUNT; k++) {
    const start = k * WAVE_STAGGER;
    if (phase <= start) continue;
    const denom = Math.max(0.05, 1 - start);
    const local = Math.min(1, (phase - start) / denom);
    const r = baseR + local * grow;
    const strokeOp = (1 - local) * 0.75;
    rings.push(
      <circle
        key={k}
        className={styles.landHitWave}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={LAND_HIT_FX_COLOR}
        strokeWidth={2}
        opacity={strokeOp}
      />
    );
  }

  return <g className={styles.landHitWaveBurst}>{rings}</g>;
}

export const LandHitFxLayer = memo(function LandHitFxLayer({
  map,
  effects,
  projR,
}: LandHitFxLayerProps): ReactElement {
  const effRef = useRef(effects);
  effRef.current = effects;
  const [, setFrame] = useState(0);
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
      setFrame((n) => n + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [sig]);

  const now = performance.now();

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
            map={map}
            projR={projR}
            phase={phase}
          />
        );
      })}
    </g>
  );
});
