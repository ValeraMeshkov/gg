import {
  mapProjectileRadiusForGameplayScale,
  mapShotSpeedPerMsForGameplayScale,
} from "./mapGameplayScale.js";
import {
  fortressProjectileLandOnArc,
  shouldFortressProjectileIntercept,
  type FortressFlightInterceptInput,
} from "./fortressShield.js";
import { flightArcBulge, waveSpawnStaggerRank } from "./flightSpread.js";
import type { WeaponStats } from "./weaponStats.js";

export type FlightSimPlan = {
  id: string;
  releaseWave: number;
  spawnTime: number;
  flightDuration: number;
  spawnDelayMs: number;
  landDelayMs: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  arcPerpX: number;
  arcPerpY: number;
  power: number;
};

export type FlightPlan = {
  fromIndex: number;
  toIndex: number;
  amount: number;
  sims: FlightSimPlan[];
};

function flightMsForDistance(dist: number, speedPerMs: number): number {
  if (dist <= 0) return 0;
  return dist / speedPerMs;
}

/** План полёта пуль (без координат карты — только тайминги). */
export function buildFlightPlan(
  amount: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  baseTime: number,
  idPrefix: string,
  weapon: WeaponStats,
  /** Масштаб карты относительно эталона (Азия); см. `mapGameplayScaleForMapId`. */
  mapGameplayScale = 1,
  fortress?: FortressFlightInterceptInput
): FlightPlan {
  const speedPerMs =
    mapShotSpeedPerMsForGameplayScale(mapGameplayScale) * weapon.speedMultiplier;
  const fullDx = tx - sx;
  const fullDy = ty - sy;
  const fullLen = Math.hypot(fullDx, fullDy) || 1;
  const px = -fullDy / fullLen;
  const py = fullDx / fullLen;
  const ballD = mapProjectileRadiusForGameplayScale(mapGameplayScale) * 2;

  const useFortressIntercept =
    fortress != null && shouldFortressProjectileIntercept(fortress);

  const sims: FlightSimPlan[] = Array.from({ length: amount }, (_, i) => {
    const releaseWave = Math.floor(i / weapon.waveSize);
    const kInWave = i - releaseWave * weapon.waveSize;
    const inWave = Math.min(
      weapon.waveSize,
      amount - releaseWave * weapon.waveSize
    );
    const arc = flightArcBulge(fullLen, ballD, weapon, kInWave, inWave, px, py);
    const land = useFortressIntercept
      ? fortressProjectileLandOnArc({
          ...fortress,
          arcPerpX: arc.arcPerpX,
          arcPerpY: arc.arcPerpY,
          chordLength: fullLen,
        })
      : {
          tx,
          ty,
          pathLength: fullLen,
          intercepted: false,
        };
    const len = land.pathLength;
    const flightDuration = flightMsForDistance(len, speedPerMs);
    const spawnTime =
      baseTime +
      releaseWave * weapon.waveGapMs +
      waveSpawnStaggerRank(kInWave, inWave) * weapon.spawnStaggerMs;
    return {
      id: `proj-${idPrefix}-${i}`,
      releaseWave,
      spawnTime,
      flightDuration,
      spawnDelayMs: Math.max(0, spawnTime - baseTime),
      landDelayMs: Math.max(0, spawnTime + flightDuration - baseTime),
      sx,
      sy,
      tx: land.tx,
      ty: land.ty,
      arcPerpX: arc.arcPerpX,
      arcPerpY: arc.arcPerpY,
      power: weapon.power,
    };
  });

  return { fromIndex: 0, toIndex: 0, amount, sims };
}
