import { memo, type ReactElement } from "react";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { MAP_PIN_OFFSET_Y_PX } from "@/components/map/buildingGlb/constants/isoConstants";
import { BuildingSpinSprite } from "@/components/map/buildingGlb/spin/BuildingSpinSprite";
import styles from "@/components/map/styles/MapView.module.scss";

export type MapGlbPinProps = {
  pinKey: string;
  skin: GlbBuildingSkinId;
  pinSize: number;
  centerX: number;
  centerY: number;
};

function MapGlbPinInner({
  pinKey,
  skin,
  pinSize,
  centerX,
  centerY,
}: MapGlbPinProps): ReactElement {
  const halfPin = pinSize / 2;
  return (
    <div
      className={styles.mapGlbPinAnchor}
      style={{
        position: "absolute",
        left: centerX,
        top: centerY,
        width: 0,
        height: 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <div
        className={styles.mapGlbPinTrack}
        style={{
          position: "absolute",
          left: -halfPin,
          top: -halfPin + MAP_PIN_OFFSET_Y_PX,
          width: pinSize,
          height: pinSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BuildingSpinSprite
          skin={skin}
          size={pinSize}
          phaseKey={pinKey}
        />
      </div>
    </div>
  );
}

function mapGlbPinEqual(prev: MapGlbPinProps, next: MapGlbPinProps): boolean {
  return (
    prev.pinKey === next.pinKey &&
    prev.skin === next.skin &&
    prev.pinSize === next.pinSize &&
    prev.centerX === next.centerX &&
    prev.centerY === next.centerY
  );
}

export const MapGlbPin = memo(MapGlbPinInner, mapGlbPinEqual);
