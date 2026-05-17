import {
  GLB_BUILDING_CATALOG,
  getGlbBuildingCatalogEntry,
  type GlbBuildingSkinId,
} from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { SPIN_SHEET_URL_BY_GLB_FILE } from "./buildingSpinSheetUrls.gen";
import manifest from "@/assets/buildings/spin-sheets/manifest.json";

type SpinSheetManifest = {
  frames: number;
  framePx: number;
  spinPeriodSec: number;
  sheets: Record<string, string>;
};

const spinManifest = manifest as SpinSheetManifest;

const urlBySkin = new Map<GlbBuildingSkinId, string>();
for (const entry of GLB_BUILDING_CATALOG) {
  const url = SPIN_SHEET_URL_BY_GLB_FILE[entry.glbFile];
  if (url) urlBySkin.set(entry.id, url);
}

export function hasBuildingSpinSheet(skin: GlbBuildingSkinId): boolean {
  return urlBySkin.has(skin);
}

export function getBuildingSpinSheetUrl(
  skin: GlbBuildingSkinId
): string | undefined {
  return urlBySkin.get(skin);
}

export function getSpinSheetManifest(): SpinSheetManifest {
  return spinManifest;
}

export function spinSheetFileForSkin(skin: GlbBuildingSkinId): string | undefined {
  const glbFile = getGlbBuildingCatalogEntry(skin).glbFile;
  return spinManifest.sheets[glbFile];
}

/** URL всех запечённых листов (прелоад на сплэше вместо GLB). */
export function allBuildingSpinSheetUrls(): readonly string[] {
  return [...urlBySkin.values()];
}
