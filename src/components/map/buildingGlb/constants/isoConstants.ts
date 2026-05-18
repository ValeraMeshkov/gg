export const SPIN_SPEED = 0.55;

/** Масштаб 3D-модели в превью настроек (квадрат кнопки не меняется). */
export const PREVIEW_SETTINGS_SCALE = 1.16;
export const PREVIEW_BOUNDS_MARGIN_BASE = 1.22;
export const PREVIEW_BOUNDS_MARGIN =
  PREVIEW_BOUNDS_MARGIN_BASE / PREVIEW_SETTINGS_SCALE;
/** Запас Bounds при вращении в настройках и на карте. */
export const SPIN_BOUNDS_MARGIN = PREVIEW_BOUNDS_MARGIN * 1.55;
export const PREVIEW_CAMERA_ZOOM = 17 * PREVIEW_SETTINGS_SCALE;

/** Размер квадрата превью в настройках (здания и бойцы). */
export const SETTINGS_BUILDING_PREVIEW_PX = 88;

/** Эталон для расчёта размера пина на карте (не менять с кнопкой настроек). */
export const MAP_PIN_REFERENCE_PX = 84;

/** Доп. крупность модели только в сетке настроек. */
export const SETTINGS_PREVIEW_MODEL_BOOST = 1.5;

/** Доп. крупность модели на карте (внутри круга точки). */
export const MAP_PREVIEW_MODEL_BOOST = 1.2;

/**
 * Множитель размера viewport пина на карте (84px × MAP_PIN_SIZE).
 * 1.0 — базовый эталон, меньше — компактнее на точке.
 */
export const MAP_PIN_SIZE = 0.92;

export const MAP_PIN_OFFSET_Y_PX = -10;

/**
 * Общий множитель размера спрайта на карте (см. MapGlbPins).
 * 1 — крупно, 0.7 — компактно (эталон под 160px bake).
 */
export const MAP_SPIN_SPRITE_DISPLAY_SCALE = 0.78;

/**
 * mapPinScale — buildingGlbCatalog.ts (запекание, npm run glb:bake-spin)
 * BUILDING_SPRITE_DISPLAY_SCALE — buildingSpriteDisplayScale.ts (карта)
 */
export { GLB_MAP_PIN_SCALE } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";

/** lookAt чуть ниже центра — модель выше в квадрате. */
export const PREVIEW_LOOK_AT_Y = -0.14;
export const PREVIEW_MODEL_Y = 0.09;

export const ISO_CAMERA_AZIMUTH = Math.PI / 4;
export const ISO_CAMERA_ELEVATION = 0.55;

export function isoCameraOffset(distance: number): [number, number, number] {
  const h = distance * Math.sin(ISO_CAMERA_ELEVATION);
  const r = distance * Math.cos(ISO_CAMERA_ELEVATION);
  return [
    r * Math.sin(ISO_CAMERA_AZIMUTH),
    h,
    r * Math.cos(ISO_CAMERA_ELEVATION),
  ];
}
