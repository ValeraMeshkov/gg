import type { ReactElement } from "react";
import type { BuildingSkinId, FighterSkinId } from "../../game/appearance";
import { BuildingMarker } from "./BuildingMarker";
import { FighterShape } from "./FighterShape";

const PREVIEW_FILL = "#2e7dd4";
const PREVIEW_STROKE = "#d8e4f4";

type SkinPreviewIconProps = {
  kind: "fighter" | "building";
  skin: FighterSkinId | BuildingSkinId;
  /** Размер холста в px. */
  size?: number;
};

/** Миниатюра скина для селектора (те же SVG, что на карте). */
export function SkinPreviewIcon({
  kind,
  skin,
  size = 28,
}: SkinPreviewIconProps): ReactElement {
  const half = size / 2;
  const glyphSize = size * 0.2;

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
      ) : (skin as BuildingSkinId) === "circle" ? (
        <circle
          cx={0}
          cy={0}
          r={glyphSize * 1.35}
          fill={PREVIEW_FILL}
          stroke={PREVIEW_STROKE}
          strokeWidth={1.5}
        />
      ) : (
        <BuildingMarker
          skin={skin as BuildingSkinId}
          cx={0}
          cy={0}
          size={glyphSize * 1.1}
          variant="p1"
          fillStyle={{ fill: PREVIEW_FILL, stroke: PREVIEW_STROKE }}
        />
      )}
    </svg>
  );
}
