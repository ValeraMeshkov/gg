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
import type { BuildingSkinId } from "@/shared/skinIds";
import {
  fortressProjectileLandOnArc,
  shouldFortressProjectileIntercept,
  spotRingRadiusForMap,
  type FortressFlightInterceptInput,
} from "@/shared/fortressShield";
import type { WeaponStats } from "@/shared/weaponStats";
import type { FlightPayload, ProjectileSim } from "./types";

export type BuildFlightFortressContext = {
  buildingForOwner: (ownerId: string | undefined) => BuildingSkinId | undefined;
};

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
  dotRadius?: number,
  fortress?: BuildFlightFortressContext
): FlightPayload {
  const center = authoritativeCenters ? mapDotCenterAuthoritative : mapDotCenter;
  const { x: sx, y: sy } = center(map, from);
  const cellCenter = center(map, to);
  const toI = cellIndex(map, to);
  const targetCell = map.cells[toI];
  const targetOwner = targetCell?.ownerId ?? null;
  const spotRingRadius = spotRingRadiusForMap(
    map.id,
    dotRadius,
    meetScale
  );

  const fullDx = cellCenter.x - sx;
  const fullDy = cellCenter.y - sy;
  const fullLen = Math.hypot(fullDx, fullDy) || 1;
  const px = -fullDy / fullLen;
  const py = fullDx / fullLen;

  const projR =
    dotRadius != null
      ? mapProjectileRadiusFromDotRadius(dotRadius)
      : mapProjectileRadius(map, meetScale);
  const ballD = projR * 2;
  const base = baseTime;
  const fid =
    attackId ?? `${base}-${Math.random().toString(36).slice(2, 10)}`;
  const visualCombat = targetOwner !== attackerId;
  const speedPerMs = mapShotSpeedPerMs(map, meetScale) * weapon.speedMultiplier;

  const fortressInput: FortressFlightInterceptInput | null = fortress
    ? {
        sx,
        sy,
        cellCenterX: cellCenter.x,
        cellCenterY: cellCenter.y,
        attackerId,
        targetOwnerId: targetOwner ?? undefined,
        defenderBuilding: fortress.buildingForOwner(targetOwner ?? undefined),
        fortressShield: targetCell?.fortressShield,
        spotRingRadius,
        meetScale,
      }
    : null;

  const useFortressIntercept =
    fortressInput != null && shouldFortressProjectileIntercept(fortressInput);

  const sims: ProjectileSim[] = Array.from({ length: amount }, (_, i) => {
    const releaseWave = Math.floor(i / weapon.waveSize);
    const kInWave = i - releaseWave * weapon.waveSize;
    const inWave = Math.min(
      weapon.waveSize,
      amount - releaseWave * weapon.waveSize
    );
    const arc = flightArcBulge(fullLen, ballD, weapon, kInWave, inWave, px, py);
    const land = useFortressIntercept
      ? fortressProjectileLandOnArc({
          ...fortressInput!,
          arcPerpX: arc.arcPerpX,
          arcPerpY: arc.arcPerpY,
          chordLength: fullLen,
        })
      : {
          tx: cellCenter.x,
          ty: cellCenter.y,
          pathLength: fullLen,
          intercepted: false,
        };
    const len = land.pathLength;
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
      tx: land.tx,
      ty: land.ty,
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
