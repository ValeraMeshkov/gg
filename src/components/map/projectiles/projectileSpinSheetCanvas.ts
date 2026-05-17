import { getBuildingSpriteDisplayScale } from "@/components/map/buildingGlb/catalog/buildingSpriteDisplayScale";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { getBuildingSpinSheetUrl } from "@/components/map/buildingGlb/spin/buildingSpinSheets";
import {
  SPIN_SHEET_FRAME_PX,
  SPIN_SHEET_FRAMES,
} from "@/components/map/buildingGlb/spin/buildingSpinSheetConstants";
import { mapSpinFrameIndexAt } from "@/components/map/buildingGlb/spin/useMapSpinFrame";
import { spinPhaseOffsetFromKey } from "@/components/map/buildingGlb/spin/spinPhaseOffset";
import { allProjectileSpinSheetUrls } from "./fighterSkinToSpinSheet";

const sheetImages = new Map<string, HTMLImageElement>();

function ensureSheetImage(url: string): HTMLImageElement | null {
  let img = sheetImages.get(url);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = url;
    sheetImages.set(url, img);
  }
  if (!img.complete || img.naturalWidth <= 0) return null;
  return img;
}

let preloadStarted = false;

export function preloadProjectileSpinSheets(): void {
  if (preloadStarted) return;
  preloadStarted = true;
  for (const url of allProjectileSpinSheetUrls()) {
    ensureSheetImage(url);
  }
}

/** Кадр из горизонтального листа; false — ещё не загружен. */
export function drawProjectileSpinSheetOnCanvas(
  ctx: CanvasRenderingContext2D,
  buildingSkin: GlbBuildingSkinId,
  mapX: number,
  mapY: number,
  projR: number,
  phaseKey: string
): boolean {
  const url = getBuildingSpinSheetUrl(buildingSkin);
  if (!url) return false;
  const img = ensureSheetImage(url);
  if (!img) return false;

  const frame =
    (mapSpinFrameIndexAt() +
      spinPhaseOffsetFromKey(phaseKey, SPIN_SHEET_FRAMES)) %
    SPIN_SHEET_FRAMES;
  const scale = getBuildingSpriteDisplayScale(buildingSkin);
  const size = projR * 2.4 * scale;
  const half = size / 2;
  const sx = frame * SPIN_SHEET_FRAME_PX;

  ctx.drawImage(
    img,
    sx,
    0,
    SPIN_SHEET_FRAME_PX,
    SPIN_SHEET_FRAME_PX,
    mapX - half,
    mapY - half,
    size,
    size
  );
  return true;
}
