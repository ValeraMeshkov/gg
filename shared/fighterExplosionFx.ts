import type { AttackAnimationId } from "./weaponStats.js";

/** Параметры SVG-взрыва: двойной контур (свет + тень) для читаемости на любом фоне. */
export type FighterExplosionVisual = {
  ringStroke: string;
  ringOutline: string;
  flashFill: string;
  flashOutline: string;
  sparkStroke: string;
  waveCount: number;
  waveStagger: number;
  strokeWidth: number;
  /** Доп. толщина тёмного кольца под ярким. */
  outlineExtra: number;
  growMul: number;
  flashMul: number;
  sparkCount: number;
  sparkReach: number;
  variant: "rings" | "burst" | "toxic" | "arcane";
};

export const FIGHTER_EXPLOSION_VISUALS: Record<
  AttackAnimationId,
  FighterExplosionVisual
> = {
  dagger: {
    ringStroke: "#e8f6ff",
    ringOutline: "#142030",
    flashFill: "#ffffff",
    flashOutline: "#1e3348",
    sparkStroke: "#9ed4ff",
    waveCount: 3,
    waveStagger: 0.1,
    strokeWidth: 1.6,
    outlineExtra: 2.4,
    growMul: 0.88,
    flashMul: 0.5,
    sparkCount: 5,
    sparkReach: 0.72,
    variant: "rings",
  },
  bomb: {
    ringStroke: "#ffe566",
    ringOutline: "#3a1800",
    flashFill: "#fff4c2",
    flashOutline: "#4a1c00",
    sparkStroke: "#ff9a3c",
    waveCount: 2,
    waveStagger: 0.2,
    strokeWidth: 2.4,
    outlineExtra: 3.2,
    growMul: 1.05,
    flashMul: 0.72,
    sparkCount: 6,
    sparkReach: 0.8,
    variant: "burst",
  },
  poison: {
    ringStroke: "#8dff9a",
    ringOutline: "#0f2818",
    flashFill: "#d4ffd8",
    flashOutline: "#0a2010",
    sparkStroke: "#5ce878",
    waveCount: 3,
    waveStagger: 0.14,
    strokeWidth: 2,
    outlineExtra: 2.8,
    growMul: 0.92,
    flashMul: 0.62,
    sparkCount: 6,
    sparkReach: 0.68,
    variant: "toxic",
  },
  potion: {
    ringStroke: "#e8b8ff",
    ringOutline: "#2a1040",
    flashFill: "#f8eeff",
    flashOutline: "#301050",
    sparkStroke: "#d080ff",
    waveCount: 2,
    waveStagger: 0.16,
    strokeWidth: 2,
    outlineExtra: 2.6,
    growMul: 0.95,
    flashMul: 0.65,
    sparkCount: 5,
    sparkReach: 0.7,
    variant: "arcane",
  },
  bullet: {
    ringStroke: "#fff8e0",
    ringOutline: "#2a2208",
    flashFill: "#ffffff",
    flashOutline: "#3a3010",
    sparkStroke: "#ffd966",
    waveCount: 2,
    waveStagger: 0.12,
    strokeWidth: 1.5,
    outlineExtra: 2.2,
    growMul: 0.7,
    flashMul: 0.42,
    sparkCount: 3,
    sparkReach: 0.55,
    variant: "rings",
  },
};

export function explosionVisualForWeapon(
  weapon: AttackAnimationId
): FighterExplosionVisual {
  return FIGHTER_EXPLOSION_VISUALS[weapon] ?? FIGHTER_EXPLOSION_VISUALS.bullet;
}

/** Какой визуал показать при столкновении двух снарядов. */
export function pickCollisionExplosionWeapon(
  a: { attackAnimation: AttackAnimationId; power: number; id: string },
  b: { attackAnimation: AttackAnimationId; power: number; id: string }
): AttackAnimationId {
  if (a.power !== b.power) {
    return a.power > b.power ? a.attackAnimation : b.attackAnimation;
  }
  return a.id < b.id ? a.attackAnimation : b.attackAnimation;
}
