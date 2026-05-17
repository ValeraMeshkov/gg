import type { GlbBuildingSkinId } from "./buildingGlbCatalog";

/** Короткое имя + файл в spin-sheets/ — один источник для UI и ассетов. */
export type BuildingGlbShortMeta = {
  label: string;
  sheet: string;
};

/** Подпись под иконкой = `label`, файл листа = `sheet`. */
export const BUILDING_GLB_SHORT: Record<
  GlbBuildingSkinId,
  BuildingGlbShortMeta
> = {
  pixellabs: { label: "башня", sheet: "bashnya.png" },
  pixellabs3822: { label: "башня2", sheet: "bashnya2.png" },
  pixellabsWatchtower: { label: "сторож", sheet: "storozh.png" },
  pixellabsSignpost: { label: "указ", sheet: "ukaz.png" },
  pixellabs3402: { label: "крист", sheet: "krist.png" },
  pixellabsPoisonBottle: { label: "яд", sheet: "yad.png" },
  pixellabsSkull: { label: "череп", sheet: "cherep.png" },
  pixellabsSkullPotion: { label: "зелье", sheet: "zele.png" },
  pixellabsSlime: { label: "слайм", sheet: "slaym.png" },
  pixellabsBanner: { label: "баннер", sheet: "banner.png" },
  pixellabsBomb: { label: "бомба", sheet: "bomba.png" },
  pixellabsPotionBottleAlt: { label: "флакон", sheet: "flakon.png" },
  pixellabsUndead: { label: "нежить", sheet: "nezhit.png" },
  pixellabsZombie: { label: "зомби", sheet: "zombi.png" },
  pixellabsGrimReaper3011: { label: "жнец", sheet: "zhnets.png" },
  tinyPlanetBoy: { label: "мальчик", sheet: "malchik.png" },
  tinyPlanetDefective: { label: "брак", sheet: "brak.png" },
  tinyPlanetEnergy: { label: "энергия", sheet: "energiya.png" },
  tinyPlanetIcon: { label: "иконка", sheet: "ikonka.png" },
  tinyPlanetShield: { label: "щит", sheet: "shchit.png" },
  tinyPlanetStar: { label: "звезда", sheet: "zvezda.png" },
  freedomShark: { label: "акула", sheet: "akula.png" },
  freedomCastle: { label: "замок", sheet: "zamok.png" },
  freedomCastle4441: { label: "замок2", sheet: "zamok2.png" },
  freedomHouse: { label: "дом", sheet: "dom.png" },
};

const sheetByGlbFile = new Map<string, string>();

export function buildingGlbShortLabel(skin: GlbBuildingSkinId): string {
  return BUILDING_GLB_SHORT[skin].label;
}

export function buildingGlbSpinSheetFile(skin: GlbBuildingSkinId): string {
  return BUILDING_GLB_SHORT[skin].sheet;
}

export function spinSheetPngForGlbFile(glbFile: string): string {
  return sheetByGlbFile.get(glbFile) ?? glbFile.replace(/\.glb$/i, ".png");
}

export function registerGlbSpinSheetFiles(
  pairs: readonly { glbFile: string; skinId: GlbBuildingSkinId }[]
): void {
  sheetByGlbFile.clear();
  for (const { glbFile, skinId } of pairs) {
    sheetByGlbFile.set(glbFile, BUILDING_GLB_SHORT[skinId].sheet);
  }
}
