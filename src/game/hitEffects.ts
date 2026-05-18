import type { AttackAnimationId } from "@/shared/weaponStats";
import { seededRandom } from "@/shared/seededRandom";

export type LandHitFx = {
  id: string;
  x: number;
  y: number;
  start: number;
  weapon: AttackAnimationId;
};

/** Смещение центра взрыва в координатах карты (детерминированно по seed). */
export function jitterExplosionPosition(
  seed: string,
  x: number,
  y: number,
  spread: number
): { x: number; y: number } {
  if (spread <= 0) return { x, y };
  const rnd = seededRandom(`explode-jitter:${seed}`);
  const u = rnd() * Math.PI * 2;
  const v = 0.22 + rnd() * 0.78;
  const r = spread * v;
  return { x: x + Math.cos(u) * r, y: y + Math.sin(u) * r };
}

/** Стабильный seed для столкновения двух пуль. */
export function collisionHitFxSeed(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

export function pruneLandHitFx(
  fx: readonly LandHitFx[],
  now: number,
  durationMs: number
): readonly LandHitFx[] {
  return fx.filter((e) => now - e.start < durationMs);
}

export function hasActiveLandHitFx(
  fx: readonly LandHitFx[],
  now: number,
  durationMs: number
): boolean {
  return pruneLandHitFx(fx, now, durationMs).length > 0;
}
