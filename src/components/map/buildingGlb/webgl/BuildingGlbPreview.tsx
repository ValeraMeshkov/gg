import type { ReactElement } from "react";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { GlbTrackedPreview } from "./GlbTrackedPreview";

type BuildingGlbPreviewProps = {
  skin: GlbBuildingSkinId;
  size?: number;
  isSelected?: boolean;
};

/** Превью в плитке (View внутри canvas строки). */
export function BuildingGlbPreview({
  skin,
  size = 28,
}: BuildingGlbPreviewProps): ReactElement {
  return (
    <GlbTrackedPreview
      skin={skin}
      size={size}
      spin
      playAnimations
      viewId={`settings-${skin}`}
    />
  );
}
