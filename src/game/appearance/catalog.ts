import { getVisibleGlbBuildingCatalog } from "@/components/map/buildingGlb";
import { FIGHTER_SKIN_LABELS, FIGHTER_SKINS } from "@/shared/skinIds";
import type { BuildingSkinId } from "@/shared/skinIds";
import type { FighterSkinId } from "./types";

export type SkinOption<T extends string> = {
  id: T;
  label: string;
};

export const FIGHTER_SKIN_OPTIONS: readonly SkinOption<FighterSkinId>[] =
  FIGHTER_SKINS.map((id) => ({ id, label: FIGHTER_SKIN_LABELS[id] }));

export function getBuildingSkinOptions(): readonly SkinOption<BuildingSkinId>[] {
  return getVisibleGlbBuildingCatalog().map(({ id, label }) => ({ id, label }));
}
