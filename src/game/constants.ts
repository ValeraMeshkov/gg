/**
 * Константы игры для клиента: баланс и геометрия — из `shared/constants.ts`,
 * здесь только то, что нужно только фронту.
 */
export {
  CELL,
  SHOT,
  TERRITORY_SHOT_SPEED_FACTOR,
  MAP_SHOT_SPEED_PER_MS,
  TERRITORY_DOT_RADIUS,
  TERRITORY_PROJECTILE_DIAMETER_RATIO,
  TERRITORY_PROJECTILE_R,
  MAP_PROJECTILE_R,
  projectileRadiusFromDot,
} from "@/shared/constants";

/** Отрисовка карты в координатах viewBox (клетка = 1). */
export const VIEW = {
  labelFont: 0.09,
} as const;
