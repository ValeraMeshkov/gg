import { memo, useMemo, type ReactElement } from "react";
import type { DisplayColorId, PlayerAppearancesMap } from "@/game/appearance";
import { ownedDotFill } from "@/game/colors/territory";
import { getCell, type TerritoryGameMap } from "@/game/maps";
import {
  hasActiveFortressShield,
  readFortressShield,
} from "@/shared/fortressShield";
import type { GlbBuildingSpot } from "./collectGlbBuildings";
import styles from "@/components/map/styles/MapView.module.scss";
import { mapGlbPinScreenSizePx } from "@/components/map/buildingGlb/constants/isoConstants";
import { mapPointToOverlayPixel } from "./mapPixelPosition";
import { FortressShieldDome } from "./FortressShieldDome";

type FortressShieldOverlayProps = {
  map: TerritoryGameMap;
  spots: readonly GlbBuildingSpot[];
  shieldKey: string;
  localPlayerId: string;
  localDisplayColor?: DisplayColorId;
  playerAppearances: PlayerAppearancesMap;
  width: number;
  height: number;
  viewBox: TerritoryGameMap["viewBox"];
};

type ShieldPinLayout = {
  key: string;
  cellIndex: number;
  ownerId: string;
  pinSize: number;
  centerX: number;
  centerY: number;
};

const FORTRESS_SKINS = new Set(["freedomCastle", "freedomCastle4441"]);

function FortressShieldOverlayInner({
  map,
  spots,
  localPlayerId,
  localDisplayColor,
  playerAppearances,
  width,
  height,
  viewBox,
}: FortressShieldOverlayProps): ReactElement {
  const layouts = useMemo((): ShieldPinLayout[] => {
    const out: ShieldPinLayout[] = [];
    for (const spot of spots) {
      if (!FORTRESS_SKINS.has(spot.skin)) continue;
      const { px, py } = mapPointToOverlayPixel(
        spot.cx,
        spot.cy,
        width,
        height,
        viewBox
      );
      const pinSize = mapGlbPinScreenSizePx(spot.targetMapSize);
      out.push({
        key: spot.key,
        cellIndex: spot.cellIndex,
        ownerId: spot.ownerId,
        pinSize,
        centerX: px,
        centerY: height - py,
      });
    }
    return out;
  }, [spots, width, height, viewBox]);

  return (
    <>
      {layouts.map((pin) => {
        const cell = getCell(map, pin.cellIndex);
        if (!hasActiveFortressShield(cell)) return null;
        const shieldPoints = readFortressShield(cell);
        const shieldColor = ownedDotFill(
          pin.ownerId,
          localPlayerId,
          localDisplayColor,
          playerAppearances
        );
        if (!shieldColor) return null;
        const domePad = 14;
        const domeSize = pin.pinSize + domePad * 2 + shieldPoints * 2;
        return (
          <div
            key={`shield:${pin.key}`}
            className={styles.mapGlbPinAnchor}
            style={{
              position: "absolute",
              left: pin.centerX,
              top: pin.centerY,
              width: 0,
              height: 0,
              overflow: "visible",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <FortressShieldDome
              size={domeSize}
              color={shieldColor}
              shieldPoints={shieldPoints}
              animateArc={false}
            />
          </div>
        );
      })}
    </>
  );
}

function shieldOverlayEqual(
  prev: FortressShieldOverlayProps,
  next: FortressShieldOverlayProps
): boolean {
  return (
    prev.shieldKey === next.shieldKey &&
    prev.spots === next.spots &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.viewBox === next.viewBox &&
    prev.localPlayerId === next.localPlayerId &&
    prev.localDisplayColor === next.localDisplayColor &&
    prev.playerAppearances === next.playerAppearances
  );
}

export const FortressShieldOverlay = memo(
  FortressShieldOverlayInner,
  shieldOverlayEqual
);
