/** Кружок на карте мира (координаты world.svg). */
export const TERRITORY_DOT_RADIUS = 14 / 1.5;

/** Диаметр пули = диаметр кружка ÷ это число (меньше — крупнее пуля). */
export const DOT_PROJECTILE_DIAMETER_RATIO = 3;

export function projectileRadiusFromDot(dotRadius: number): number {
  return (dotRadius * 2) / DOT_PROJECTILE_DIAMETER_RATIO / 2;
}

export const TERRITORY_LABEL_FONT = 12;

export const TERRITORY_LABEL_OFFSET_Y = 20;
