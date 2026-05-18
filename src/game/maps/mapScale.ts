import {
  mapGameplayScaleForViewBoxWidth,
  mapGameplayScaleFromMeet,
  mapProjectileRadiusForGameplayScale,
  mapShotSpeedPerMsForGameplayScale,
} from "@/shared/mapGameplayScale";
import {
  NEUTRAL_SPOT_DOT_RADIUS,
  projectileRadiusFromDot,
  TERRITORY_DOT_HIT_PADDING,
  TERRITORY_DOT_RADIUS,
  TERRITORY_DOT_RING_PADDING,
  TERRITORY_LABEL_FONT,
  TERRITORY_LABEL_OFFSET_Y,
} from "@/game/mapLayout";
import type { GameMap } from "./world/types";

export { REFERENCE_MAP_VIEWBOX_WIDTH, REFERENCE_MEET_SCALE } from "@/shared/mapGameplayScale";
export {
  mapGameplayScaleForMapId,
  mapGameplayScaleForViewBoxWidth,
  mapGameplayScaleFromMeet,
} from "@/shared/mapGameplayScale";

/** @deprecated Используйте `mapGameplayScaleForViewBoxWidth` */
export function mapViewBoxDisplayScale(map: GameMap): number {
  return mapGameplayScaleForViewBoxWidth(map.viewBox.width);
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

/**
 * Единиц viewBox за мс. С `meetScale` — та же скорость на экране, что на эталонной карте.
 */
export function mapShotSpeedPerMs(
  map: GameMap,
  meetScale?: number
): number {
  const gameplayScale =
    meetScale != null && meetScale > 0
      ? mapGameplayScaleFromMeet(meetScale)
      : mapViewBoxDisplayScale(map);
  return mapShotSpeedPerMsForGameplayScale(gameplayScale);
}

/** Радиус пули в viewBox; с `meetScale` совпадает с размером точки на экране. */
export function mapProjectileRadius(map: GameMap, meetScale?: number): number {
  const gameplayScale =
    meetScale != null && meetScale > 0
      ? mapGameplayScaleFromMeet(meetScale)
      : mapViewBoxDisplayScale(map);
  return mapProjectileRadiusForGameplayScale(gameplayScale);
}

/** Радиус пули из радиуса точки (как в `computeMapSpotMetrics`). */
export function mapProjectileRadiusFromDotRadius(dotRadius: number): number {
  return projectileRadiusFromDot(dotRadius);
}

export function mapExplosionFlashGrow(map: GameMap, meetScale?: number): number {
  return mapProjectileRadius(map, meetScale) * 3.5;
}

export function mapExplosionRingBase(map: GameMap, meetScale?: number): number {
  return mapProjectileRadius(map, meetScale) * 2.8;
}

export function mapExplosionRingGrow(map: GameMap, meetScale?: number): number {
  return mapProjectileRadius(map, meetScale) * 10;
}

export function mapTargetGlowRadius(map: GameMap): number {
  return mapTerritoryDotRadius(map) * 2;
}
