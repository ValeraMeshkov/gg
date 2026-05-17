import type { ReactElement } from "react";
import type { BuildingSkinId, FighterSkinId } from "@/game/appearance";
import { BuildingGlbPreview } from "@/components/map/buildingGlb/webgl/BuildingGlbPreview";
import { isGlbBuildingSkin } from "@/components/map/buildingGlb";
import { BuildingMarker } from "@/components/map/spots/BuildingMarker";
import { FighterShape } from "@/components/map/spots/FighterShape";

const PREVIEW_FILL = "#2e7dd4";
const PREVIEW_STROKE = "#d8e4f4";

type SkinPreviewIconProps = {
  kind: "fighter" | "building";
  skin: FighterSkinId | BuildingSkinId;
  /** Размер холста в px. */
  size?: number;
  isSelected?: boolean;
};

/** Миниатюра скина для селектора (те же SVG, что на карте). */
export function SkinPreviewIcon({
  kind,
  skin,
  size = 28,
  isSelected = false,
}: SkinPreviewIconProps): ReactElement {
  const half = size / 2;
  const glyphSize = kind === "building" ? size * 0.48 : size * 0.27;

  if (kind === "building") {
    const buildingSkin = skin as BuildingSkinId;
    if (isGlbBuildingSkin(buildingSkin)) {
      return (
        <BuildingGlbPreview
          skin={buildingSkin}
          size={size}
          isSelected={isSelected}
        />
      );
    }
  }

  return (
    <svg
      className="skinPreviewIcon"
      width={size}
      height={size}
      viewBox={`${-half} ${-half} ${size} ${size}`}
      aria-hidden
    >
      {kind === "fighter" ? (
        <FighterShape
          skin={skin as FighterSkinId}
          x={0}
          y={0}
          angle={-Math.PI / 2}
          size={glyphSize}
          fill={PREVIEW_FILL}
        />
      ) : (
        <BuildingMarker
          skin={skin as BuildingSkinId}
          cx={0}
          cy={0}
          size={glyphSize}
          variant="p1"
          fillStyle={{ fill: PREVIEW_FILL, stroke: PREVIEW_STROKE }}
        />
      )}
    </svg>
  );
}
