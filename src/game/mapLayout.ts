import {
  projectileRadiusFromDot,
  TERRITORY_DOT_RADIUS,
  TERRITORY_PROJECTILE_DIAMETER_RATIO,
} from "@/shared/constants";

export {
  TERRITORY_DOT_RADIUS,
  TERRITORY_PROJECTILE_DIAMETER_RATIO,
  /** @deprecated Имя из старого клиента — используйте `TERRITORY_PROJECTILE_DIAMETER_RATIO`. */
  TERRITORY_PROJECTILE_DIAMETER_RATIO as DOT_PROJECTILE_DIAMETER_RATIO,
  projectileRadiusFromDot,
};

/** Нейтральная точка — маленький маркер вместо 3D-здания. */
export const NEUTRAL_SPOT_DOT_RADIUS = 11;

/** Кольцо выделения точки: радиус = TERRITORY_DOT_RADIUS + это значение. */
export const TERRITORY_DOT_RING_PADDING = 8;

export const TERRITORY_SPOT_RING_RADIUS =
  TERRITORY_DOT_RADIUS + TERRITORY_DOT_RING_PADDING;

/** Ореол / тень вокруг точки (см. TerritoryMapSpotLayers SPOT_COLOR_SHADOW_RADIUS). */
export const TERRITORY_SPOT_GLOW_RADIUS = TERRITORY_SPOT_RING_RADIUS * 1.55;

/**
 * Зона наведения / прицела на точку: TERRITORY_DOT_RADIUS + это значение
 * (совпадает с интерактивным hit в TerritoryMapSpotLayers).
 */
export const TERRITORY_DOT_HIT_PADDING = 14;

export function territoryDotHitRadius(): number {
  return TERRITORY_DOT_RADIUS + TERRITORY_DOT_HIT_PADDING;
}

export const TERRITORY_LABEL_FONT = 12;

export const TERRITORY_LABEL_OFFSET_Y = 20;
