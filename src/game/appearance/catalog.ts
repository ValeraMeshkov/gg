import { getVisibleGlbBuildingCatalog } from "@/components/map/buildingGlb";
import { hasNonDefaultBuildingMechanics } from "@/shared/buildingMechanics";
import { isFortressBuilding } from "@/shared/fortressShield";
import { WEAPON_FIGHTER_SKINS } from "@/shared/defaultFighters";
import {
  BUILDING_SKINS,
  FIGHTER_SKIN_LABELS,
  FIGHTER_SKINS,
  type BuildingSkinId,
} from "@/shared/skinIds";
import type { FighterSkinId } from "./types";

export type SkinOption<T extends string> = {
  id: T;
  label: string;
};

export const FIGHTER_SKIN_OPTIONS: readonly SkinOption<FighterSkinId>[] =
  FIGHTER_SKINS.map((id) => ({ id, label: FIGHTER_SKIN_LABELS[id] }));

/** Оружие в боковой панели (3D-спрайты в полёте). */
export const SETTINGS_FIGHTER_SKINS = WEAPON_FIGHTER_SKINS;

export type SettingsFighterSkinId = (typeof SETTINGS_FIGHTER_SKINS)[number];

const FIGHTER_SKIN_SHORT_LABELS: Record<SettingsFighterSkinId, string> = {
  bomb: "бомба",
  poison: "яд",
  potion: "зелье",
  dagger: "дагер",
};

export function getFighterSkinOptions(): readonly SkinOption<FighterSkinId>[] {
  return SETTINGS_FIGHTER_SKINS.map((id) => ({
    id,
    label: FIGHTER_SKIN_LABELS[id],
  }));
}

export function fighterSkinShortLabel(id: FighterSkinId): string {
  if ((SETTINGS_FIGHTER_SKINS as readonly string[]).includes(id)) {
    return FIGHTER_SKIN_SHORT_LABELS[id as SettingsFighterSkinId];
  }
  return FIGHTER_SKIN_LABELS[id as FighterSkinId] ?? id;
}

export function getBuildingSkinOptions(): readonly SkinOption<BuildingSkinId>[] {
  const playable = new Set<string>(BUILDING_SKINS);
  const opts = getVisibleGlbBuildingCatalog()
    .filter((e) => playable.has(e.id))
    .map(({ id, label }) => ({ id: id as BuildingSkinId, label }));

  function hasExtraAbilities(id: BuildingSkinId): boolean {
    return hasNonDefaultBuildingMechanics(id) || isFortressBuilding(id);
  }

  return [...opts].sort((a, b) => {
    const ta = hasExtraAbilities(a.id) ? 0 : 1;
    const tb = hasExtraAbilities(b.id) ? 0 : 1;
    if (ta !== tb) return ta - tb;
    return 0;
  });
}
