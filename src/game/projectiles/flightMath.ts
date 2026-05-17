import type { ProjectilePath } from "@/shared/projectileMotion";
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
  };
}

export function flightMsForMapDistance(dist: number, map: GameMap): number {
  if (dist <= 0) return 0;
  return dist / mapShotSpeedPerMs(map);
}

export function projectileDrawPosition(
  sim: ProjectileSim,
  now: number
): { x: number; y: number } | null {
  const t = now - sim.spawnTime;
  if (t < 0) return null;
  const ax = sim.sx + sim.offX;
  const ay = sim.sy + sim.offY;
  const bx = sim.tx + sim.offX;
  const by = sim.ty + sim.offY;
  const fd = sim.flightDuration;
  if (fd <= 0) return { x: bx, y: by };
  if (t >= fd) return null;
  const k = t / fd;
  return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k };
}

export function projectileFlightAngle(sim: ProjectileSim): number {
  const ax = sim.sx + sim.offX;
  const ay = sim.sy + sim.offY;
  const bx = sim.tx + sim.offX;
  const by = sim.ty + sim.offY;
  return Math.atan2(by - ay, bx - ax);
}

export function projectileLandPosition(sim: ProjectileSim): {
  x: number;
  y: number;
} {
  return { x: sim.tx + sim.offX, y: sim.ty + sim.offY };
}
