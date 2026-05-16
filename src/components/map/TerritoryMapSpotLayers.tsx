import {
  memo,
  type Dispatch,
  type MutableRefObject,
  type ReactElement,
  type SetStateAction,
} from "react";
import type { CSSProperties } from "react";
import {
  getCell,
  isTerritoryIndexHidden,
  mapDotCenter,
  cellUnderCursorTerritoryDot,
  territoryCellPos,
  type CellPos,
  type TerritoryGameMap,
} from "../../game/maps";
import {
  TERRITORY_DOT_RADIUS,
  TERRITORY_DOT_HIT_PADDING,
  TERRITORY_DOT_RING_PADDING,
  TERRITORY_LABEL_FONT,
  TERRITORY_LABEL_OFFSET_Y,
} from "../../game/mapLayout";
import {
  dotVariantForOwner,
  ownedDotFill,
  ownedTerritoryColorsForView,
} from "../../game/playerColors";
import { appearanceForPlayer, type PlayerAppearancesMap } from "../../game/appearance";
import type { DisplayColorId } from "../../game/appearance";
import { BuildingMarker } from "./BuildingMarker";
import { clientPointToMapSpace } from "./svgCoords";
import type { UnitDotVariant } from "./UnitDot";
import styles from "../MapView.module.scss";

function cellStyles(
  cell: ReturnType<typeof getCell>,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  playerAppearances?: PlayerAppearancesMap
): {
  dotVariant: UnitDotVariant;
  dotMidFillStyle?: CSSProperties;
} {
  const units = cell.units ?? 0;
  const owned = cell.ownerId
    ? ownedTerritoryColorsForView(
        cell.ownerId,
        localPlayerId,
        units,
        localDisplayColor,
        undefined,
        playerAppearances
      )
    : null;
  if (owned) {
    return {
      dotVariant: dotVariantForOwner(
        cell.ownerId,
        localPlayerId,
        localDisplayColor
      ),
      dotMidFillStyle: {
        fill:
          ownedDotFill(
            cell.ownerId ?? "",
            localPlayerId,
            localDisplayColor,
            playerAppearances
          ) ?? owned.fill,
      },
    };
  }
  return { dotVariant: "neutral" };
}

export type DragState = {
  sources: CellPos[];
  hoverCell: CellPos | null;
  aimEnd: { x: number; y: number };
};

export type TerritorySpotStaticProps = {
  map: TerritoryGameMap;
  index: number;
  hiddenOpts?: { syncMapLayout?: boolean };
  localPlayerId: string;
  localDisplayColor?: DisplayColorId;
  playerAppearances: PlayerAppearancesMap;
  firstMovePulseFromIndex: number | null;
};

function spotStaticEqual(
  p: TerritorySpotStaticProps,
  n: TerritorySpotStaticProps
): boolean {
  if (
    p.index !== n.index ||
    p.localPlayerId !== n.localPlayerId ||
    p.localDisplayColor !== n.localDisplayColor ||
    p.firstMovePulseFromIndex !== n.firstMovePulseFromIndex ||
    p.playerAppearances !== n.playerAppearances ||
    p.map.id !== n.map.id
  ) {
    return false;
  }
  const c1 = getCell(p.map, p.index);
  const c2 = getCell(n.map, n.index);
  if (
    c1.ownerId !== c2.ownerId ||
    c1.units !== c2.units
  ) {
    return false;
  }
  if (p.hiddenOpts?.syncMapLayout !== n.hiddenOpts?.syncMapLayout) return false;
  if (
    isTerritoryIndexHidden(p.map, p.index, p.hiddenOpts) !==
    isTerritoryIndexHidden(n.map, n.index, n.hiddenOpts)
  ) {
    return false;
  }
  return true;
}

/** Пульсация первого хода + здание + число юнитов (без колец и hit). */
export const TerritorySpotStatic = memo(function TerritorySpotStatic({
  map,
  index,
  hiddenOpts,
  localPlayerId,
  localDisplayColor,
  playerAppearances,
  firstMovePulseFromIndex,
}: TerritorySpotStaticProps): ReactElement | null {
  if (isTerritoryIndexHidden(map, index, hiddenOpts)) return null;

  const pos = territoryCellPos(index);
  const cell = getCell(map, index);
  const { dotVariant, dotMidFillStyle } = cellStyles(
    cell,
    localPlayerId,
    localDisplayColor,
    playerAppearances
  );
  const units = cell.units ?? 0;
  const owner = cell.ownerId;
  const buildingSkin = owner
    ? appearanceForPlayer(playerAppearances, owner).building
    : "circle";
  const isFirstMovePulseSpot =
    firstMovePulseFromIndex != null && index === firstMovePulseFromIndex;
  const dotCenter = mapDotCenter(map, pos);
  const ownRingR = TERRITORY_DOT_RADIUS + TERRITORY_DOT_RING_PADDING;

  return (
    <>
      {isFirstMovePulseSpot ? (
        <g
          className={styles.firstMoveSpotPulseWrap}
          transform={`translate(${dotCenter.x},${dotCenter.y})`}
        >
          <circle
            cx={0}
            cy={0}
            className={styles.firstMoveSpotPulseRingA}
            r={ownRingR}
          />
          <circle
            cx={0}
            cy={0}
            className={styles.firstMoveSpotPulseRingB}
            r={ownRingR}
          />
        </g>
      ) : null}
      <g
        className={
          isFirstMovePulseSpot ? styles.firstMoveSpotMarkerPulse : undefined
        }
      >
        <BuildingMarker
          skin={buildingSkin}
          cx={dotCenter.x}
          cy={dotCenter.y}
          size={TERRITORY_DOT_RADIUS}
          variant={dotVariant}
          fillStyle={dotMidFillStyle}
        />
        <text
          className={styles.territoryLabel}
          x={dotCenter.x}
          y={dotCenter.y + TERRITORY_LABEL_OFFSET_Y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={TERRITORY_LABEL_FONT}
        >
          {units}
        </text>
      </g>
    </>
  );
}, spotStaticEqual);

export type TerritorySpotInteractiveProps = {
  map: TerritoryGameMap;
  index: number;
  hiddenOpts?: { syncMapLayout?: boolean };
  localPlayerId: string;
  hoveredOwnIndex: number | null;
  inMulti: boolean;
  svgRef: MutableRefObject<SVGSVGElement | null>;
  setHoveredOwnIndex: (v: number | null) => void;
  setDrag: Dispatch<SetStateAction<DragState | null>>;
};

/** Кольцо выделения + зона нажатия; обновляется при ховере/драге. */
export function TerritorySpotInteractive({
  map,
  index,
  hiddenOpts,
  localPlayerId,
  hoveredOwnIndex,
  inMulti,
  svgRef,
  setHoveredOwnIndex,
  setDrag,
}: TerritorySpotInteractiveProps): ReactElement | null {
  if (isTerritoryIndexHidden(map, index, hiddenOpts)) return null;

  const pos = territoryCellPos(index);
  const cell = getCell(map, index);
  const owner = cell.ownerId;
  const units = cell.units ?? 0;
  const canDragFrom = owner === localPlayerId && units > 0;
  if (!canDragFrom) return null;

  const ownHighlighted = hoveredOwnIndex === index || inMulti;
  const ownRingR = TERRITORY_DOT_RADIUS + TERRITORY_DOT_RING_PADDING;
  const ownHitR = TERRITORY_DOT_RADIUS + TERRITORY_DOT_HIT_PADDING;
  const dotCenter = mapDotCenter(map, pos);

  return (
    <>
      {ownHighlighted ? (
        <circle
          className={`${styles.ownDotRing}${
            inMulti ? ` ${styles.ownDotRingSelected}` : ""
          }`}
          cx={dotCenter.x}
          cy={dotCenter.y}
          r={ownRingR}
        />
      ) : null}
      <circle
        className={styles.ownDotHit}
        cx={dotCenter.x}
        cy={dotCenter.y}
        r={ownHitR}
        onPointerEnter={() => setHoveredOwnIndex(index)}
        onPointerLeave={() => setHoveredOwnIndex(null)}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHoveredOwnIndex(index);
          svgRef.current?.setPointerCapture(e.pointerId);
          const svg = svgRef.current;
          const pt = svg
            ? clientPointToMapSpace(svg, e.clientX, e.clientY)
            : null;
          const aim = pt ?? dotCenter;
          setDrag((d0) => {
            if (
              d0 &&
              d0.sources.length >= 2 &&
              d0.sources.some((s) => s.x === pos.x)
            ) {
              return {
                ...d0,
                hoverCell: cellUnderCursorTerritoryDot(
                  map,
                  aim.x,
                  aim.y,
                  hiddenOpts
                ),
                aimEnd: aim,
              };
            }
            return {
              sources: [pos],
              hoverCell: cellUnderCursorTerritoryDot(
                map,
                aim.x,
                aim.y,
                hiddenOpts
              ),
              aimEnd: aim,
            };
          });
        }}
      />
    </>
  );
}
