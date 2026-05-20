import type { BuildingSkinId } from "./skinIds.js";
import type { CombatCell } from "./landHit.js";
import {
  fortressShieldHitRadiusViewBox,
  hasActiveFortressShield,
  isFortressBuilding,
  readFortressShield,
} from "./fortressShield.js";
import {
  projectilePositionAt,
  type ProjectilePath,
} from "./projectileMotion.js";

export type FortressShieldZone = {
  cellIndex: number;
  ownerId: string;
  cx: number;
  cy: number;
  radius: number;
};

export function collectFortressShieldZones(
  cells: readonly CombatCell[],
  opts: {
    cellCenter: (index: number) => { x: number; y: number } | null;
    buildingForOwner: (ownerId: string) => BuildingSkinId | undefined;
    spotRingRadius: number;
    meetScale?: number;
    isVisibleCell?: (index: number) => boolean;
  }
): FortressShieldZone[] {
  const zones: FortressShieldZone[] = [];
  for (let i = 0; i < cells.length; i++) {
    if (opts.isVisibleCell && !opts.isVisibleCell(i)) continue;
    const cell = cells[i];
    const ownerId = cell?.ownerId;
    if (!ownerId) continue;
    if (!isFortressBuilding(opts.buildingForOwner(ownerId))) continue;
    if (!hasActiveFortressShield(cell)) continue;
    const center = opts.cellCenter(i);
    if (!center) continue;
    const shield = readFortressShield(cell);
    zones.push({
      cellIndex: i,
      ownerId,
      cx: center.x,
      cy: center.y,
      radius: fortressShieldHitRadiusViewBox(
        opts.spotRingRadius,
        shield,
        opts.meetScale
      ),
    });
  }
  return zones;
}

/**
 * Первое касание щита чужой крепости на отрезке пути за интервал [t0, now].
 */
export function projectileFortressShieldHitDuringInterval(
  path: ProjectilePath,
  zones: readonly FortressShieldZone[],
  attackerId: string,
  t0: number,
  now: number
): { zone: FortressShieldZone; x: number; y: number } | null {
  if (zones.length === 0 || now <= t0) return null;
  const tStart = Math.max(t0, path.spawnTime);
  const tEnd = Math.min(now, path.spawnTime + path.flightDuration);
  if (tEnd <= tStart) return null;

  const steps = Math.max(4, Math.ceil((tEnd - tStart) / 16));
  let best: { zone: FortressShieldZone; x: number; y: number } | null = null;
  let bestT = Infinity;

  for (let s = 0; s <= steps; s++) {
    const ts = tStart + ((tEnd - tStart) * s) / steps;
    if (ts >= bestT) continue;
    const pos = projectilePositionAt(path, ts);
    if (!pos) continue;
    for (const zone of zones) {
      if (zone.ownerId === attackerId) continue;
      const dx = pos.x - zone.cx;
      const dy = pos.y - zone.cy;
      if (dx * dx + dy * dy <= zone.radius * zone.radius) {
        bestT = ts;
        best = { zone, x: pos.x, y: pos.y };
        break;
      }
    }
  }
  return best;
}
