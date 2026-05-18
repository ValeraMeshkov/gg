import type { ReactElement } from "react";
import type { FighterSkinId } from "@/game/appearance";
import { getBuildingSpriteDisplayScale } from "@/components/map/buildingGlb/catalog/buildingSpriteDisplayScale";
import { BuildingSpinSprite } from "@/components/map/buildingGlb/spin/BuildingSpinSprite";
import { buildingSpinSkinForFighter } from "@/components/map/projectiles/fighterSkinToSpinSheet";
import { SkinPreviewIcon } from "@/components/map/glyphs/SkinPreviewIcon";
import { weaponStatsForFighter } from "@/shared/weaponStats";

/** Масштаб спрайта бомбы в карточке настроек (в пределах слота). */
function settingsSpinDisplayScale(
  catalogScale: number,
  weaponVisualScale: number
): number {
  const boost = 0.82 + Math.min(0.28, (weaponVisualScale - 1) * 0.14);
  return catalogScale * boost;
}

type FighterSettingsPreviewProps = {
  fighter: FighterSkinId;
  size: number;
  animated?: boolean;
};

/** Превью бойца в сетке настроек (как у зданий). */
export function FighterSettingsPreview({
  fighter,
  size,
  animated = true,
}: FighterSettingsPreviewProps): ReactElement {
  const spinSkin = buildingSpinSkinForFighter(fighter);
  if (spinSkin) {
    const weapon = weaponStatsForFighter(fighter);
    return (
      <BuildingSpinSprite
        skin={spinSkin}
        size={size}
        displayScale={settingsSpinDisplayScale(
          getBuildingSpriteDisplayScale(spinSkin),
          weapon.visualScale
        )}
        spinSpeed={weapon.spinSpeed}
        phaseKey={`settings-fighter-${fighter}`}
        animated={animated}
      />
    );
  }

  return <SkinPreviewIcon kind="fighter" skin={fighter} size={size} />;
}
