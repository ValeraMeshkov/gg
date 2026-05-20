import type { GlbBuildingSkinId } from "./buildingGlbCatalog";
import { BUILDING_GLB_SHORT } from "./buildingGlbShortNames";

/**
 * Масштаб отображения спрайта на карте и в настройках.
 */
const defaultSpriteDisplayScale = Object.fromEntries(
  (Object.keys(BUILDING_GLB_SHORT) as GlbBuildingSkinId[]).map((id) => [id, 1])
) as Record<GlbBuildingSkinId, number>;

export const BUILDING_SPRITE_DISPLAY_SCALE: Record<GlbBuildingSkinId, number> =
  {
    ...defaultSpriteDisplayScale,
    pixellabsWatchtower: 0.8, // сторож
    pixellabsSignpost: 0.8, // указ
    freedomCastle: 0.8, // замок
    freedomHouse: 0.8, // дом
    pixellabs3822: 0.8, // башня 2

    // бойцы
    pixellabsPoisonBottle: 1.2, // яд
    pixellabsSkullPotion: 1.2, // зелье
    pixellabsDagger3178: 1.2, // дагер
    pixellabsBomb: 1.2, // бомба
  };

export function getBuildingSpriteDisplayScale(skin: GlbBuildingSkinId): number {
  return BUILDING_SPRITE_DISPLAY_SCALE[skin] ?? 1;
}

/**
 * Поворот всей spin-анимации при показе (градусы, по часовой).
 */
export const SPIN_SHEET_DISPLAY_ROTATION_DEG: Partial<
  Record<GlbBuildingSkinId, number>
> = {
  pixellabsDagger3178: 90,
};

export function getSpinSheetDisplayRotationRad(
  skin: GlbBuildingSkinId
): number {
  const deg = SPIN_SHEET_DISPLAY_ROTATION_DEG[skin];
  return deg != null ? (deg * Math.PI) / 180 : 0;
}

/**
 * Сдвиг «носа» spin-листа к направлению полёта (градусы).
 * Лист запечён вертикально: +90° = нос вправо при angle=0, как треугольник.
 */
export const SPIN_SHEET_FLIGHT_FORWARD_OFFSET_DEG: Partial<
  Record<GlbBuildingSkinId, number>
> = {
  pixellabsDagger3178: 90,
};

const DEFAULT_FLIGHT_FORWARD_OFFSET_DEG = 90;

export function getSpinSheetFlightRotationRad(
  skin: GlbBuildingSkinId,
  flightAngle: number
): number {
  const offsetDeg =
    SPIN_SHEET_FLIGHT_FORWARD_OFFSET_DEG[skin] ??
    DEFAULT_FLIGHT_FORWARD_OFFSET_DEG;
  return flightAngle + (offsetDeg * Math.PI) / 180;
}

/** Подгонка центра спрайта в квадрате настроек (px). */
export const BUILDING_SPRITE_SETTINGS_NUDGE_PX: Partial<
  Record<GlbBuildingSkinId, { x: number; y: number }>
> = {
  blendertimerHeart23: { x: -5, y: 0 },
  pixellabsSkeletonArcher4240: { x: 5, y: 0 },
  pixellabsZombie: { x: 0, y: 2 },
};

export function getBuildingSpriteSettingsNudge(
  skin: GlbBuildingSkinId
): { x: number; y: number } | undefined {
  return BUILDING_SPRITE_SETTINGS_NUDGE_PX[skin];
}
