import { memo, useMemo, type ReactElement } from "react";
import type { TerritoryGameMap } from "@/game/maps";
import type { GlbBuildingSpot } from "./collectGlbBuildings";
import styles from "@/components/map/styles/MapView.module.scss";
import {
  MAP_PIN_OFFSET_Y_PX,
  MAP_PIN_REFERENCE_PX,
  MAP_SPIN_SPRITE_DISPLAY_SCALE,
} from "@/components/map/buildingGlb/constants/isoConstants";
import { mapPointToOverlayPixel } from "./mapPixelPosition";
import { BuildingSpinSprite } from "@/components/map/buildingGlb/spin/BuildingSpinSprite";

type MapGlbPinsProps = {
  spots: readonly GlbBuildingSpot[];
  width: number;
  height: number;
  viewBox: TerritoryGameMap["viewBox"];
};

type MapPinLayout = {
  key: string;
  skin: GlbBuildingSpot["skin"];
  pinSize: number;
  centerX: number;
  centerY: number;
};

function MapGlbPinsInner({
  spots,
  width,
  height,
  viewBox,
}: MapGlbPinsProps): ReactElement {
  const pins = useMemo((): MapPinLayout[] => {
    return spots.map((spot) => {
      const { px, py, scale } = mapPointToOverlayPixel(
        spot.cx,
        spot.cy,
        width,
        height,
        viewBox
      );
      const pinSize = Math.max(
        24,
        Math.round(
          Math.min(
            Math.round(MAP_PIN_REFERENCE_PX * 1.35),
            Math.max(28, Math.round(spot.targetMapSize * scale))
          ) * MAP_SPIN_SPRITE_DISPLAY_SCALE
        )
      );
      return {
        key: `${spot.key}:${spot.skin}`,
        skin: spot.skin,
        pinSize,
        centerX: px,
        centerY: height - py,
      };
    });
  }, [spots, width, height, viewBox]);

  return (
    <>
      {pins.map((pin) => (
        <div
          key={pin.key}
          className={styles.mapGlbPinTrack}
          style={{
            position: "absolute",
            left: pin.centerX,
            top: pin.centerY,
            width: pin.pinSize,
            height: pin.pinSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translate(-50%, calc(-50% + ${MAP_PIN_OFFSET_Y_PX}px))`,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <BuildingSpinSprite
            skin={pin.skin}
            size={pin.pinSize}
            phaseKey={pin.key}
          />
        </div>
      ))}
    </>
  );
}

export const MapGlbPins = memo(MapGlbPinsInner);
