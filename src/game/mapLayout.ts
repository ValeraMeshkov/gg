/** Кружок на карте мира (координаты world.svg). */
export const TERRITORY_DOT_RADIUS = 14 / 1.5;

/** Кольцо выделения точки: радиус = TERRITORY_DOT_RADIUS + это значение. */
export const TERRITORY_DOT_RING_PADDING = 8;

/**
 * Зона наведения / прицела на точку: TERRITORY_DOT_RADIUS + это значение
 * (совпадает с интерактивным hit в TerritoryMapSpotLayers).
 */
export const TERRITORY_DOT_HIT_PADDING = 14;

export function territoryDotHitRadius(): number {
  return TERRITORY_DOT_RADIUS + TERRITORY_DOT_HIT_PADDING;
}

/** Диаметр пули = диаметр кружка ÷ это число (меньше — крупнее пуля). */
export const DOT_PROJECTILE_DIAMETER_RATIO = 3;

export function projectileRadiusFromDot(dotRadius: number): number {
  return (dotRadius * 2) / DOT_PROJECTILE_DIAMETER_RATIO / 2;
}

export const TERRITORY_LABEL_FONT = 12;

export const TERRITORY_LABEL_OFFSET_Y = 20;
