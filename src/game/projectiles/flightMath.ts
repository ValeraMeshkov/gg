import type { ProjectilePath } from "@/shared/projectileMotion";
import {
  projectilePositionAt,
  projectilePositionAtProgress,
  projectileTangentAtProgress,
} from "@/shared/projectileMotion";
import type { GameMap } from "@/game/maps/types";
import { mapShotSpeedPerMs } from "@/game/maps/mapScale";
import type { ProjectileSim } from "./types";

export function simToPath(sim: ProjectileSim): ProjectilePath {
  return {
    spawnTime: sim.spawnTime,
    flightDuration: sim.flightDuration,
    sx: sim.sx,
    sy: sim.sy,
    tx: sim.tx,
    ty: sim.ty,
    arcPerpX: sim.arcPerpX,
    arcPerpY: sim.arcPerpY,
  };
}

export function flightMsForMapDistance(
  dist: number,
  map: GameMap,
  meetScale?: number
): number {
  if (dist <= 0) return 0;
  return dist / mapShotSpeedPerMs(map, meetScale);
}

export function projectileDrawPosition(
  sim: ProjectileSim,
  now: number
): { x: number; y: number } | null {
  return projectilePositionAt(simToPath(sim), now);
}

export function projectileFlightAngle(sim: ProjectileSim, now?: number): number {
  const path = simToPath(sim);
  const t = (now ?? performance.now()) - sim.spawnTime;
  const fd = sim.flightDuration;
  const k =
    fd <= 0 ? 1 : Math.min(1, Math.max(0, t / fd));
  const tan = projectileTangentAtProgress(path, k);
  return Math.atan2(tan.y, tan.x);
}

export function projectileLandPosition(sim: ProjectileSim): {
  x: number;
  y: number;
} {
  return projectilePositionAtProgress(simToPath(sim), 1);
}
