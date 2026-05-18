import { MAP_SHOT_SPEED_PER_MS, TERRITORY_PROJECTILE_R } from "./constants.js";

/** Эталон — Азия; под неё подобраны точки и `TERRITORY_DOT_RADIUS`. */
export const REFERENCE_MAP_VIEWBOX_WIDTH = 753.6;

/**
 * Типичный `meet`-масштаб SVG при ~900px ширине поля (см. `mapSpotMetrics.ts`).
 * Скорость и размер пули в viewBox делятся на фактический meet, чтобы на экране были стабильны.
 */
export const REFERENCE_MEET_SCALE = 900 / REFERENCE_MAP_VIEWBOX_WIDTH;

/** Ширина viewBox по id карты (из `world/generated/*.ts`). */
const MAP_VIEWBOX_WIDTH: Record<string, number> = {
  africa: 543.6,
  asia: 753.6,
  europe: 389.3,
  "north-america": 892.7,
  oceania: 451.8,
  "south-america": 312.7,
};

/** Масштаб геймплея от ширины viewBox (fallback без размера контейнера). */
export function mapGameplayScaleForViewBoxWidth(viewBoxWidth: number): number {
  if (viewBoxWidth <= 0) return 1;
  return viewBoxWidth / REFERENCE_MAP_VIEWBOX_WIDTH;
}

export function mapGameplayScaleForMapId(mapId: string): number {
  const w = MAP_VIEWBOX_WIDTH[mapId] ?? REFERENCE_MAP_VIEWBOX_WIDTH;
  return mapGameplayScaleForViewBoxWidth(w);
}

/** Из фактического meet контейнера (клиент). */
export function mapGameplayScaleFromMeet(meetScale: number): number {
  if (meetScale <= 0) return 1;
  return REFERENCE_MEET_SCALE / meetScale;
}

export function mapShotSpeedPerMsForGameplayScale(
  gameplayScale: number
): number {
  return MAP_SHOT_SPEED_PER_MS * gameplayScale;
}

export function mapProjectileRadiusForGameplayScale(
  gameplayScale: number
): number {
  return TERRITORY_PROJECTILE_R * gameplayScale;
}
