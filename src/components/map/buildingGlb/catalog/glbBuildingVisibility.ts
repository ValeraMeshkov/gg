import {
  GLB_BUILDING_CATALOG,
  type GlbBuildingCatalogEntry,
  type GlbBuildingSkinId,
} from "./buildingGlbCatalog";
import { GLB_HIDDEN_BUILDING_SKINS } from "./glbBuildingConfig";

import {
  GLB_BUILDING_VISIBILITY_CHANGE_EVENT,
  STORAGE_KEYS,
} from "@/constants/storageKeys";

export const GLB_BUILDING_VISIBILITY_STORAGE_KEY =
  STORAGE_KEYS.glbBuildingVisibility;
export { GLB_BUILDING_VISIBILITY_CHANGE_EVENT };

export type GlbBuildingVisibilityState = {
  readonly hiddenSkins: readonly GlbBuildingSkinId[];
  readonly savedAt?: string;
};

function isGlbSkinId(v: unknown): v is GlbBuildingSkinId {
  return typeof v === "string" && GLB_BUILDING_CATALOG.some((e) => e.id === v);
}

export function getCodeHiddenGlbBuildings(): ReadonlySet<GlbBuildingSkinId> {
  return new Set(GLB_HIDDEN_BUILDING_SKINS);
}

export function loadGlbBuildingVisibility(): GlbBuildingVisibilityState | null {
  try {
    const raw = localStorage.getItem(GLB_BUILDING_VISIBILITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const hiddenSkins = Array.isArray((parsed as GlbBuildingVisibilityState).hiddenSkins)
      ? (parsed as GlbBuildingVisibilityState).hiddenSkins.filter(isGlbSkinId)
      : [];
    return {
      hiddenSkins,
      savedAt:
        typeof (parsed as GlbBuildingVisibilityState).savedAt === "string"
          ? (parsed as GlbBuildingVisibilityState).savedAt
          : undefined,
    };
  } catch {
    return null;
  }
}

/** localStorage редактора, иначе массив из кода. */
export function getEffectiveHiddenGlbBuildings(): ReadonlySet<GlbBuildingSkinId> {
  const stored = loadGlbBuildingVisibility();
  if (stored) return new Set(stored.hiddenSkins);
  return getCodeHiddenGlbBuildings();
}

export function isGlbBuildingVisible(skin: GlbBuildingSkinId): boolean {
  return !getEffectiveHiddenGlbBuildings().has(skin);
}

export function saveGlbBuildingVisibility(hiddenSkins: Iterable<GlbBuildingSkinId>): void {
  const payload: GlbBuildingVisibilityState = {
    hiddenSkins: [...hiddenSkins].sort(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(
    GLB_BUILDING_VISIBILITY_STORAGE_KEY,
    JSON.stringify(payload)
  );
  window.dispatchEvent(new CustomEvent(GLB_BUILDING_VISIBILITY_CHANGE_EVENT));
}

export function buildVisibilityStateFromCode(): GlbBuildingVisibilityState {
  return { hiddenSkins: [...GLB_HIDDEN_BUILDING_SKINS] };
}

export function getVisibleGlbBuildingCatalog(): readonly GlbBuildingCatalogEntry[] {
  return GLB_BUILDING_CATALOG.filter((e) => isGlbBuildingVisible(e.id));
}
