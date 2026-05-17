import { SHOT } from "@/game/constants";
import {
  cellIndex,
  mapDotCenter,
  type CellPos,
  type GameMap,
} from "@/game/maps";
import { mapDotCenterAuthoritative } from "@/game/maps/mapDotCenters";
import { mapProjectileRadius } from "@/game/maps/mapScale";
import { flightMsForMapDistance } from "./flightMath";
import type { FlightPayload, ProjectileSim } from "./types";

export function buildFlightPayload(
  amount: number,
  from: CellPos,
  to: CellPos,
  map: GameMap,
  attackerId: string,
  baseTime: number = performance.now(),
  attackId?: string,
  /** В онлайне — те же центры, что на сервере (без localStorage). */
  authoritativeCenters = false
): FlightPayload {
  const center = authoritativeCenters ? mapDotCenterAuthoritative : mapDotCenter;
  const { x: sx, y: sy } = center(map, from);
  const { x: tx, y: ty } = center(map, to);
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;

  const ballD = mapProjectileRadius(map) * 2;
  const lateralStep = ballD * SHOT.neighborCenterDistBallDiameters;

  const ux = dx / len;
  const uy = dy / len;
  const wedgeStep = ballD * SHOT.wedgeAlongBallDiametersPerRank;
  const base = baseTime;
  const fid =
    attackId ?? `${base}-${Math.random().toString(36).slice(2, 10)}`;
  const toI = cellIndex(map, to);
  const targetOwner = map.cells[toI]?.ownerId ?? null;
  const visualCombat = targetOwner !== attackerId;

  const sims: ProjectileSim[] = Array.from({ length: amount }, (_, i) => {
    const releaseWave = Math.floor(i / SHOT.waveSize);
    const kInWave = i - releaseWave * SHOT.waveSize;
    const inWave = Math.min(
      SHOT.waveSize,
      amount - releaseWave * SHOT.waveSize
    );
    const half = (inWave - 1) / 2;
    const lateral = (kInWave - half) * lateralStep;
    const distFromCenter = Math.abs(kInWave - half);
    const wedgeRank = half - distFromCenter;
    const along0 = wedgeStep * wedgeRank;
    const offXL = px * lateral;
    const offYL = py * lateral;
    const sxSim = sx + ux * along0 + offXL;
    const sySim = sy + uy * along0 + offYL;
    const txSim = tx + offXL;
    const tySim = ty + offYL;
    const segDx = txSim - sxSim;
    const segDy = tySim - sySim;
    const segLen = Math.hypot(segDx, segDy) || 1;
    const flightDuration = flightMsForMapDistance(segLen, map);
    return {
      id: `proj-${fid}-${i}`,
      flightFid: fid,
      releaseWave,
      spawnTime: base + releaseWave * SHOT.bulletBatchGapMs,
      flightDuration,
      sx: sxSim,
      sy: sySim,
      tx: txSim,
      ty: tySim,
      offX: 0,
      offY: 0,
      placeInRow: kInWave + 1,
      rowWidth: inWave,
      hitAffiliationId: attackerId,
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
