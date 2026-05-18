import {
  cellIndex,
  mapDotCenter,
  type CellPos,
  type GameMap,
} from "@/game/maps";
import { mapDotCenterAuthoritative } from "@/game/maps/mapDotCenters";
import {
  mapProjectileRadius,
  mapProjectileRadiusFromDotRadius,
  mapShotSpeedPerMs,
} from "@/game/maps/mapScale";
import { flightArcBulge, waveSpawnStaggerRank } from "@/shared/flightSpread";
import type { WeaponStats } from "@/shared/weaponStats";
import type { FlightPayload, ProjectileSim } from "./types";

export function buildFlightPayload(
  amount: number,
  from: CellPos,
  to: CellPos,
  map: GameMap,
  attackerId: string,
  weapon: WeaponStats,
  baseTime: number = performance.now(),
  attackId?: string,
  /** В онлайне — те же центры, что на сервере (без localStorage). */
  authoritativeCenters = false,
  /** Фактический meet SVG; стабилизирует скорость и размер залпа на экране. */
  meetScale?: number,
  /** Радиус точки в viewBox (из `computeMapSpotMetrics`); точнее, чем только meet. */
  dotRadius?: number
): FlightPayload {
  const center = authoritativeCenters ? mapDotCenterAuthoritative : mapDotCenter;
  const { x: sx, y: sy } = center(map, from);
  const { x: tx, y: ty } = center(map, to);
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;

  const projR =
    dotRadius != null
      ? mapProjectileRadiusFromDotRadius(dotRadius)
      : mapProjectileRadius(map, meetScale);
  const ballD = projR * 2;
  const base = baseTime;
  const fid =
    attackId ?? `${base}-${Math.random().toString(36).slice(2, 10)}`;
  const toI = cellIndex(map, to);
  const targetOwner = map.cells[toI]?.ownerId ?? null;
  const visualCombat = targetOwner !== attackerId;
  const speedPerMs = mapShotSpeedPerMs(map, meetScale) * weapon.speedMultiplier;

  const sims: ProjectileSim[] = Array.from({ length: amount }, (_, i) => {
    const releaseWave = Math.floor(i / weapon.waveSize);
    const kInWave = i - releaseWave * weapon.waveSize;
    const inWave = Math.min(
      weapon.waveSize,
      amount - releaseWave * weapon.waveSize
    );
    const arc = flightArcBulge(len, ballD, weapon, kInWave, inWave, px, py);
    const flightDuration = len / speedPerMs;
    return {
      id: `proj-${fid}-${i}`,
      flightFid: fid,
      releaseWave,
      spawnTime:
        base +
        releaseWave * weapon.waveGapMs +
        waveSpawnStaggerRank(kInWave, inWave) * weapon.spawnStaggerMs,
      flightDuration,
      sx,
      sy,
      tx,
      ty,
      arcPerpX: arc.arcPerpX,
      arcPerpY: arc.arcPerpY,
      placeInRow: kInWave + 1,
      rowWidth: inWave,
      hitAffiliationId: attackerId,
      power: weapon.power,
      attackAnimation: weapon.id,
    };
  });
  return {
    attackId: fid,
    sims,
    fromIndex: cellIndex(map, from),
    toIndex: toI,
    amount,
    visualCombat,
    waveSpawnTids: {},
    simLandTids: {},
  };
}
