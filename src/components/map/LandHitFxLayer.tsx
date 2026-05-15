import type { ReactElement } from "react";
import { SHOT } from "../../game/constants";
import type { LandHitFx } from "../../game/hitEffects";
import { LAND_HIT_FX_COLOR } from "../../game/hitEffects";
import type { GameMap } from "../../game/maps";
import { mapExplosionRingGrow } from "../../game/maps/mapScale";
import styles from "../MapView.module.scss";

const WAVE_COUNT = 4;
const WAVE_STAGGER = 0.14;

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
    const strokeOp = (1 - local) * 0.82;
    rings.push(
      <circle
        key={k}
        className={styles.landHitWave}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={LAND_HIT_FX_COLOR}
        strokeWidth={1.55}
        opacity={strokeOp}
        filter="url(#landHitFxGlow)"
      />
    );
  }

  return <g className={styles.landHitWaveBurst}>{rings}</g>;
}

export function LandHitFxLayer({
  map,
  effects,
  projR,
}: LandHitFxLayerProps): ReactElement {
  const now = performance.now();

  return (
    <g aria-hidden>
      <defs>
        <filter
          id="landHitFxGlow"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
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
}
