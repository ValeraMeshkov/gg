import type { WeaponStats } from "./weaponStats.js";

type SpreadWeapon = Pick<
  WeaponStats,
  "lateralSpacingBallDiameters" | "wedgeAlongBallDiameters"
>;

/**
 * На короткой дистанции уменьшает разброс, чтобы дуга не выходила за цель.
 */
export function flightSpreadScale(
  shotLen: number,
  ballD: number,
  weapon: SpreadWeapon,
  inWave: number
): number {
  if (shotLen <= 0 || inWave <= 1) return 1;
  const half = (inWave - 1) / 2;
  const lateralStep = ballD * weapon.lateralSpacingBallDiameters;
  const spreadReach = lateralStep * half;
  if (spreadReach <= 0) return 1;
  return Math.min(1, (shotLen * 0.85) / spreadReach);
}

export type FlightArcBulge = {
  /** Максимальный поперечный сдвиг в середине траектории (viewBox). */
  arcPerpX: number;
  arcPerpY: number;
};

/**
 * Амплитуда дуги для снаряда в волне: центр — 0 (прямая), боковые — дуга к центру A/B.
 */
/**
 * Порядок вылета в волне: центр → внутренние → крайние (слева раньше справа).
 * 5 снарядов: 3-й, 2-й, 4-й, 1-й, 5-й (индексы 2,1,3,0,4).
 */
export function waveSpawnStaggerRank(
  kInWave: number,
  inWave: number
): number {
  if (inWave <= 1) return 0;
  const center = (inWave - 1) / 2;
  const order = Array.from({ length: inWave }, (_, k) => k).sort((a, b) => {
    const da = Math.abs(a - center);
    const db = Math.abs(b - center);
    if (da !== db) return da - db;
    return a - b;
  });
  const rank = order.indexOf(kInWave);
  return rank >= 0 ? rank : kInWave;
}

export function flightArcBulge(
  shotLen: number,
  ballD: number,
  weapon: SpreadWeapon,
  kInWave: number,
  inWave: number,
  perpX: number,
  perpY: number
): FlightArcBulge {
  const half = (inWave - 1) / 2;
  const scale = flightSpreadScale(shotLen, ballD, weapon, inWave);
  const lateralStep = ballD * weapon.lateralSpacingBallDiameters;
  const lateral = (kInWave - half) * lateralStep * scale;
  return {
    arcPerpX: perpX * lateral,
    arcPerpY: perpY * lateral,
  };
}
