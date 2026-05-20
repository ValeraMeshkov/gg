import type { ReactElement } from "react";
import type { BuildingSkinId } from "@/game/appearance";
import type { SkinOption } from "@/game/appearance/catalog";
import {
  isGlbBuildingSkin,
  type GlbBuildingSkinId,
} from "@/components/map/buildingGlb/catalog";
import {
  getBuildingSpriteDisplayScale,
  getBuildingSpriteSettingsNudge,
} from "@/components/map/buildingGlb/catalog/buildingSpriteDisplayScale";
import { SETTINGS_BUILDING_INNER_PREVIEW_PX } from "@/components/map/buildingGlb/constants/isoConstants";
import { BuildingSpinSprite } from "@/components/map/buildingGlb/spin/BuildingSpinSprite";
import { hasBuildingSpinSheet } from "@/components/map/buildingGlb/spin/buildingSpinSheets";
import { AppearanceSettingsGrid } from "@/components/settings/AppearanceSettingsGrid";

export {
  centerAppearanceInSettingsViewport,
  centerBuildingInSettingsViewport,
} from "@/components/settings/AppearanceSettingsGrid";

type BuildingGlbSettingsGridProps = {
  options: readonly SkinOption<BuildingSkinId>[];
  building: BuildingSkinId;
  onBuildingChange: (skin: BuildingSkinId) => void;
  scrollRoot: HTMLElement | null;
};

/**
 * Здания в настройках: запечённые спрайт-листы (без WebGL и без GLB в рантайме).
 */
export function BuildingGlbSettingsGrid({
  options,
  building,
  onBuildingChange,
  scrollRoot,
}: BuildingGlbSettingsGridProps): ReactElement {
  return (
    <AppearanceSettingsGrid
      options={options}
      selected={building}
      onSelect={onBuildingChange}
      scrollRoot={scrollRoot}
      ariaLabel="Здания"
      hasPreview={(opt) => {
        const skin = opt.id;
        return (
          isGlbBuildingSkin(skin) &&
          hasBuildingSpinSheet(skin as GlbBuildingSkinId)
        );
      }}
      renderPreview={({ opt, visible, size }) => {
        const skin = opt.id as GlbBuildingSkinId;
        return (
          <BuildingSpinSprite
            skin={skin}
            size={size}
            displayScale={getBuildingSpriteDisplayScale(skin)}
            nudgePx={getBuildingSpriteSettingsNudge(skin)}
            phaseKey={`settings-${opt.id}`}
            animated={visible}
          />
        );
      }}
      previewSize={SETTINGS_BUILDING_INNER_PREVIEW_PX}
    />
  );
}
