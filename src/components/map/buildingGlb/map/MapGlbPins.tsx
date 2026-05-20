import { memo, useMemo, type ReactElement } from "react";
import type { GlbBuildingSpot } from "./collectGlbBuildings";
import { mapGlbPinScreenSizePx } from "@/components/map/buildingGlb/constants/isoConstants";
import { mapPointToOverlayPixel } from "./mapPixelPosition";
import { MapGlbPin } from "./MapGlbPin";
import type { TerritoryGameMap } from "@/game/maps";

type MapGlbPinsProps = {
  spots: readonly GlbBuildingSpot[];
  width: number;
  height: number;
  viewBox: TerritoryGameMap["viewBox"];
};

function MapGlbPinsInner({
  spots,
  width,
  height,
  viewBox,
}: MapGlbPinsProps): ReactElement {
  const pins = useMemo(() => {
    return spots.map((spot) => {
      const { px, py } = mapPointToOverlayPixel(
        spot.cx,
        spot.cy,
        width,
        height,
        viewBox
      );
      const pinSize = mapGlbPinScreenSizePx(spot.targetMapSize);
      return {
        pinKey: `${spot.key}:${spot.skin}`,
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
        <MapGlbPin
          key={pin.pinKey}
          pinKey={pin.pinKey}
          skin={pin.skin}
          pinSize={pin.pinSize}
          centerX={pin.centerX}
          centerY={pin.centerY}
        />
      ))}
    </>
  );
}

function mapGlbPinsEqual(
  prev: MapGlbPinsProps,
  next: MapGlbPinsProps
): boolean {
  return (
    prev.spots === next.spots &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.viewBox === next.viewBox
  );
}

export const MapGlbPins = memo(MapGlbPinsInner, mapGlbPinsEqual);
