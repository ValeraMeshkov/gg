import {
  NEUTRAL_SPOT_DOT_RADIUS,
  projectileRadiusFromDot,
  TERRITORY_DOT_HIT_PADDING,
  TERRITORY_DOT_RADIUS,
  TERRITORY_DOT_RING_PADDING,
  TERRITORY_LABEL_FONT,
  TERRITORY_LABEL_OFFSET_Y,
} from "@/game/mapLayout";
import { SHOT } from "@/game/constants";
import type { GameMap } from "./world/types";

/**
 * Координаты world.svg ~в 150× крупнее клетки сетки (1×1).
 * Без этого `flightDuration` для пули = десятки минут — кажется, что пули «стоят».
 */
const TERRITORY_SHOT_SPEED_FACTOR = 150;

/** Эталон — Азия; `TERRITORY_DOT_RADIUS` подобран под её viewBox. */
export const REFERENCE_MAP_VIEWBOX_WIDTH = 753.6;

/** На картах с узким viewBox (Европа) SVG meet даёт больший zoom — уменьшаем радиусы в viewBox. */
export function mapViewBoxDisplayScale(map: GameMap): number {
  return map.viewBox.width / REFERENCE_MAP_VIEWBOX_WIDTH;
}

export function mapTerritoryDotRadius(map: GameMap): number {
  return TERRITORY_DOT_RADIUS * mapViewBoxDisplayScale(map);
}

export function mapNeutralSpotDotRadius(map: GameMap): number {
  return NEUTRAL_SPOT_DOT_RADIUS * mapViewBoxDisplayScale(map);
}

export function mapTerritoryDotRingPadding(map: GameMap): number {
  return TERRITORY_DOT_RING_PADDING * mapViewBoxDisplayScale(map);
}

export function mapTerritoryDotHitPadding(map: GameMap): number {
  return TERRITORY_DOT_HIT_PADDING * mapViewBoxDisplayScale(map);
}

export function mapTerritorySpotRingRadius(map: GameMap): number {
  return mapTerritoryDotRadius(map) + mapTerritoryDotRingPadding(map);
}

export function mapTerritoryDotHitRadius(map: GameMap): number {
  return mapTerritoryDotRadius(map) + mapTerritoryDotHitPadding(map);
}

export function mapTerritoryLabelFont(map: GameMap): number {
  return TERRITORY_LABEL_FONT * mapViewBoxDisplayScale(map);
}

export function mapTerritoryLabelOffsetY(map: GameMap): number {
  return TERRITORY_LABEL_OFFSET_Y * mapViewBoxDisplayScale(map);
}

/** Единиц viewBox за мс (чем больше — тем быстрее полёт). */
export function mapShotSpeedPerMs(_map: GameMap): number {
  return SHOT.speedPerMs * TERRITORY_SHOT_SPEED_FACTOR;
}

/** Радиус пули: диаметр кружка ÷ 3 (масштаб точки учитывает карту). */
export function mapProjectileRadius(map: GameMap): number {
  return projectileRadiusFromDot(mapTerritoryDotRadius(map));
}

export function mapExplosionFlashGrow(map: GameMap): number {
  return mapProjectileRadius(map) * 3.5;
}

export function mapExplosionRingBase(map: GameMap): number {
  return mapProjectileRadius(map) * 2.8;
}

export function mapExplosionRingGrow(map: GameMap): number {
  return mapProjectileRadius(map) * 10;
}

export function mapTargetGlowRadius(map: GameMap): number {
  return mapTerritoryDotRadius(map) * 2;
}
