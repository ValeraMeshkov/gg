import type { ReactElement } from "react";
import type { BuildingSkinId, FighterSkinId } from "@/game/appearance";
import { BuildingGlbPreview } from "@/components/map/buildingGlb/webgl/BuildingGlbPreview";
import { isGlbBuildingSkin } from "@/components/map/buildingGlb";
import { getBuildingSpriteDisplayScale } from "@/components/map/buildingGlb/catalog/buildingSpriteDisplayScale";
import { BuildingSpinSprite } from "@/components/map/buildingGlb/spin/BuildingSpinSprite";
import { buildingSpinSkinForFighter } from "@/components/map/projectiles/fighterSkinToSpinSheet";
import styles from "./SkinPreviewIcon.module.scss";
import { BuildingMarker } from "@/components/map/spots/BuildingMarker";
import { FighterShape } from "@/components/map/spots/FighterShape";
import { weaponStatsForFighter } from "@/shared/weaponStats";

const PREVIEW_FILL = "#2e7dd4";
const PREVIEW_STROKE = "#d8e4f4";

/** Масштаб спрайта в кнопке настроек: крупнее при visualScale, но в пределах слота. */
function settingsSpinDisplayScale(
  catalogScale: number,
  weaponVisualScale: number
): number {
  const boost = 0.82 + Math.min(0.28, (weaponVisualScale - 1) * 0.14);
  return catalogScale * boost;
}

type SkinPreviewIconProps = {
  kind: "fighter" | "building";
  skin: FighterSkinId | BuildingSkinId;
  /** Размер холста в px. */
  size?: number;
  isSelected?: boolean;
};

/** Миниатюра скина для селектора (3D-спрайт или SVG). */
export function SkinPreviewIcon({
  kind,
  skin,
  size = 28,
  isSelected = false,
}: SkinPreviewIconProps): ReactElement {
  const half = size / 2;
  const fighterWeapon =
    kind === "fighter" ? weaponStatsForFighter(skin as FighterSkinId) : null;
  const fighterVisualScale = fighterWeapon?.visualScale ?? 1;
  const glyphSize =
    kind === "building" ? size * 0.48 : size * 0.27 * fighterVisualScale;

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

  if (kind === "fighter") {
    const spinSkin = buildingSpinSkinForFighter(skin as FighterSkinId);
    if (spinSkin) {
      return (
        <div
          className={styles.fighterSpinHost}
          style={{ width: size, height: size }}
          aria-hidden
        >
          <BuildingSpinSprite
            skin={spinSkin}
            size={size}
            displayScale={settingsSpinDisplayScale(
              getBuildingSpriteDisplayScale(spinSkin),
              fighterVisualScale
            )}
            spinSpeed={fighterWeapon?.spinSpeed ?? 1}
            phaseKey={`settings-fighter-${skin}`}
          />
        </div>
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
