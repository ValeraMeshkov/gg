import { seededRandom } from "../../shared/seededRandom";

/** Белые расходящиеся волны при попадании. */
export const LAND_HIT_FX_COLOR = "#ffffff";

export type LandHitFx = {
  id: string;
  x: number;
  y: number;
  start: number;
  /** @deprecated Не используется при отрисовке; см. LAND_HIT_FX_COLOR. */
  color: string;
};

/** 70% без эффекта, 30% — взрывная волна (детерминировано по seed). */
export function rollLandHitFx(seed: string): boolean {
  return seededRandom(`land-hit:${seed}`)() >= 0.7;
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
