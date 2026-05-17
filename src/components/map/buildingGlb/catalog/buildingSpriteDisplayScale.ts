import type { GlbBuildingSkinId } from "./buildingGlbCatalog";
import { BUILDING_GLB_SHORT } from "./buildingGlbShortNames";

/**
 * Масштаб отображения спрайта на карте и в настройках.
 * 1 — базовый, 0.9 — на 10% меньше. Перезапекание не нужно.
 *
 * Ключ = id в коде, короткое имя — в buildingGlbShortNames.ts (`label` / `sheet`).
 */
const defaultSpriteDisplayScale = Object.fromEntries(
  (Object.keys(BUILDING_GLB_SHORT) as GlbBuildingSkinId[]).map((id) => [id, 1])
) as Record<GlbBuildingSkinId, number>;

export const BUILDING_SPRITE_DISPLAY_SCALE: Record<GlbBuildingSkinId, number> =
  {
    ...defaultSpriteDisplayScale,
    pixellabsPoisonBottle: 0.8, // яд
    pixellabsPotionBottleAlt: 0.8, // флакон
    pixellabsWatchtower: 0.8, // сторож
    pixellabsSignpost: 0.8, // указ
    pixellabsSkull: 0.8, // череп
    pixellabsSkullPotion: 0.8, // зелье
    pixellabsBanner: 0.8, // баннер
    pixellabsBomb: 0.8, // бомба
    freedomCastle: 0.8, // замок
  };

export function getBuildingSpriteDisplayScale(skin: GlbBuildingSkinId): number {
  return BUILDING_SPRITE_DISPLAY_SCALE[skin] ?? 1;
}
