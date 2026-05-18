import type { MapProjectileDraw } from "./mapProjectileTypes";
import { projectileDebugHalfExtent } from "./projectileDrawExtents";
import { fighterSkinForWeapon, weaponStatsById } from "@/shared/weaponStats";

type WaveBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Отладочные рамки: синяя — каждый снаряд, красная — волна залпа. */
export function drawProjectileWaveDebugBorders(
  ctx: CanvasRenderingContext2D,
  projectiles: readonly MapProjectileDraw[],
  projR: number,
  mapScale: number,
  dpr: number,
  options: { waveBorders?: boolean; projectileBorders?: boolean } = {}
): void {
  const { waveBorders = true, projectileBorders = true } = options;
  if (projectiles.length === 0) return;

  const lineWidth = 1 / (mapScale * dpr);
  const groups = new Map<string, WaveBox>();

  ctx.save();
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([]);

  if (projectileBorders) {
    ctx.strokeStyle = "#1e88e5";
    for (const p of projectiles) {
      const fighter = fighterSkinForWeapon(p.attackAnimation);
      const drawR = projR * weaponStatsById(p.attackAnimation).visualScale;
      const half = projectileDebugHalfExtent(drawR, fighter);
      const side = half * 2;
      ctx.strokeRect(p.x - half, p.y - half, side, side);
    }
  }

  if (waveBorders) {
    for (const p of projectiles) {
      const fighter = fighterSkinForWeapon(p.attackAnimation);
      const drawR = projR * weaponStatsById(p.attackAnimation).visualScale;
      const half = projectileDebugHalfExtent(drawR, fighter);
      const key = `${p.flightFid}:${p.gridRow}`;
      let box = groups.get(key);
      if (!box) {
        box = {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY,
        };
        groups.set(key, box);
      }
      box.minX = Math.min(box.minX, p.x - half);
      box.minY = Math.min(box.minY, p.y - half);
      box.maxX = Math.max(box.maxX, p.x + half);
      box.maxY = Math.max(box.maxY, p.y + half);
    }

    ctx.strokeStyle = "#e53935";
    for (const box of groups.values()) {
      if (!Number.isFinite(box.minX)) continue;
      ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
    }
  }

  ctx.restore();
}
