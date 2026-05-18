import { getBuildingSpriteDisplayScale } from "@/components/map/buildingGlb/catalog/buildingSpriteDisplayScale";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import type { FighterSkinId } from "@/game/appearance";
import { buildingSpinSkinForFighter } from "./fighterSkinToSpinSheet";

/** Как в `projectileSpinSheetCanvas`: сторона квадрата кадра на карте. */
export function projectileSpinDrawHalfSize(
  drawR: number,
  buildingSkin: GlbBuildingSkinId
): number {
  const size = drawR * 2.4 * getBuildingSpriteDisplayScale(buildingSkin);
  return size / 2;
}

/** Половина стороны отладочного квадрата ≈ как рисуется снаряд. */
export function projectileDebugHalfExtent(
  drawR: number,
  fighter: FighterSkinId
): number {
  const spinSkin = buildingSpinSkinForFighter(fighter);
  if (spinSkin) {
    return projectileSpinDrawHalfSize(drawR, spinSkin);
  }
  if (fighter === "triangle") {
    return drawR * 1.15;
  }
  return drawR * 1.35 * 1.35;
}
