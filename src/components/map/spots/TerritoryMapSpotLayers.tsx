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
} from "@/game/maps";
import { useMapSpotMetrics } from "./MapSpotMetricsContext";
import { CELL } from "@/game/constants";
import {
  dotVariantForOwner,
  ownedDotFill,
  ownedTerritoryColorsForView,
} from "@/game/playerColors";
import {
  appearanceForPlayer,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import type { DisplayColorId } from "@/game/appearance";
import { isGlbBuildingSkin } from "@/components/map/buildingGlb";
import { BuildingMarker } from "./BuildingMarker";
import { clientPointToMapSpace } from "@/components/map/utils/svgCoords";
import type { UnitDotVariant } from "./UnitDot";
import styles from "@/components/map/styles/MapView.module.scss";

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
        stroke: owned.stroke,
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
  /** При прицеле — цветное кольцо скрыто, остаётся только красное. */
  aimTargetIndex?: number | null;
};

function spotStaticEqual(
  p: TerritorySpotStaticProps,
  n: TerritorySpotStaticProps
): boolean {
  if (
    p.index !== n.index ||
    p.localPlayerId !== n.localPlayerId ||
    p.localDisplayColor !== n.localDisplayColor ||
    p.aimTargetIndex !== n.aimTargetIndex ||
    p.playerAppearances !== n.playerAppearances ||
    p.map.id !== n.map.id
  ) {
    return false;
  }
  const c1 = getCell(p.map, p.index);
  const c2 = getCell(n.map, n.index);
  if (c1.ownerId !== c2.ownerId || c1.units !== c2.units) {
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

/** Радиус внутренней тени — до внешнего кольца (без «плитки» в центре). */
function spotInnerShadowRadius(ringR: number): number {
  return ringR;
}

function ownedSpotShadowColor(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  playerAppearances?: PlayerAppearancesMap
): string | null {
  const owned = ownedTerritoryColorsForView(
    ownerId,
    localPlayerId,
    CELL.ownedCap,
    localDisplayColor,
    1,
    playerAppearances
  );
  return owned?.stroke ?? owned?.fill ?? null;
}

/** Тёмная тень цвета игрока: плотнее в центре, к внешнему кольцу расходится. */
function territorySpotInnerShadow(
  mapId: string,
  index: number,
  dotCenter: { x: number; y: number },
  color: string,
  ringR: number
): ReactElement {
  const gradId = `spot-inner-shadow-${mapId}-${index}`;
  const shadowR = spotInnerShadowRadius(ringR);
  return (
    <g className={styles.spotInnerShadow} aria-hidden>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
          <stop offset="32%" stopColor={color} stopOpacity={0.82} />
          <stop offset="58%" stopColor={color} stopOpacity={0.58} />
          <stop offset="80%" stopColor={color} stopOpacity={0.32} />
          <stop offset="94%" stopColor={color} stopOpacity={0.1} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle
        cx={dotCenter.x}
        cy={dotCenter.y}
        r={shadowR}
        fill={`url(#${gradId})`}
      />
    </g>
  );
}

/** Белый пульс на своих точках (бесконечно на всю партию). */
function territorySpotOwnPulse(
  dotCenter: { x: number; y: number },
  ringR: number
): ReactElement {
  return (
    <g
      className={styles.ownSpotPulseWrap}
      transform={`translate(${dotCenter.x},${dotCenter.y})`}
      aria-hidden
    >
      <circle cx={0} cy={0} className={styles.ownSpotPulseRingA} r={ringR} />
      <circle cx={0} cy={0} className={styles.ownSpotPulseRingB} r={ringR} />
    </g>
  );
}

/** Пульсация первого хода + здание + число юнитов (без колец и hit). */
function territorySpotIndicatorRing(
  dotCenter: { x: number; y: number },
  ringR: number,
  stroke: string,
  className?: string,
  withHalo = false
): ReactElement {
  return (
    <g aria-hidden>
      {withHalo ? (
        <circle
          className={styles.spotIndicatorRingHalo}
          cx={dotCenter.x}
          cy={dotCenter.y}
          r={ringR}
        />
      ) : null}
      <circle
        className={`${styles.spotIndicatorRing}${
          className ? ` ${className}` : ""
        }`}
        cx={dotCenter.x}
        cy={dotCenter.y}
        r={ringR}
        stroke={stroke}
      />
    </g>
  );
}

export const TerritorySpotStatic = memo(function TerritorySpotStatic({
  map,
  index,
  hiddenOpts,
  localPlayerId,
  localDisplayColor,
  playerAppearances,
  aimTargetIndex = null,
}: TerritorySpotStaticProps): ReactElement | null {
  const spot = useMapSpotMetrics(map);
  if (isTerritoryIndexHidden(map, index, hiddenOpts)) return null;

  const pos = territoryCellPos(index);
  const cell = getCell(map, index);
  const units = cell.units ?? 0;
  const dotCenter = mapDotCenter(map, pos);
  const spotRingR = spot.spotRingRadius;
  const isNeutral = !cell.ownerId;
  const isOwn = cell.ownerId === localPlayerId;
  const isEnemy = cell.ownerId != null && !isOwn;

  const isAimTarget = aimTargetIndex === index;
  let innerShadow: ReactElement | null = null;
  if (!isAimTarget && cell.ownerId) {
    const shadowColor = ownedSpotShadowColor(
      cell.ownerId,
      localPlayerId,
      localDisplayColor,
      playerAppearances
    );
    if (shadowColor) {
      innerShadow = territorySpotInnerShadow(
        map.id,
        index,
        dotCenter,
        shadowColor,
        spotRingR
      );
    }
  }

  let indicatorRing: ReactElement | null = null;
  if (!isAimTarget && isEnemy) {
    const ringStroke = ownedDotFill(
      cell.ownerId!,
      localPlayerId,
      localDisplayColor,
      playerAppearances
    );
    if (ringStroke) {
      indicatorRing = territorySpotIndicatorRing(
        dotCenter,
        spotRingR,
        ringStroke,
        undefined,
        true
      );
    }
  }

  return (
    <>
      {innerShadow}
      {indicatorRing}
      {isNeutral ? (
        <circle
          className={styles.neutralSpotDot}
          cx={dotCenter.x}
          cy={dotCenter.y}
          r={spot.neutralDotRadius}
          aria-hidden
        />
      ) : null}
      {isOwn && !isAimTarget
        ? territorySpotOwnPulse(dotCenter, spotRingR)
        : null}
      <g>
        <text
          className={`${styles.territoryLabel}${
            isNeutral ? ` ${styles.territoryLabelNeutral}` : ""
          }`}
          x={dotCenter.x}
          y={dotCenter.y + spot.labelOffsetY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={spot.labelFont}
        >
          {units}
        </text>
      </g>
    </>
  );
},
spotStaticEqual);

export type TerritorySpotBuildingProps = Pick<
  TerritorySpotStaticProps,
  | "map"
  | "index"
  | "hiddenOpts"
  | "localPlayerId"
  | "localDisplayColor"
  | "playerAppearances"
>;

function spotBuildingEqual(
  p: TerritorySpotBuildingProps,
  n: TerritorySpotBuildingProps
): boolean {
  if (!spotStaticEqual(p, n)) return false;
  const o1 = getCell(p.map, p.index).ownerId;
  const o2 = getCell(n.map, n.index).ownerId;
  if (!o1 || !o2) return o1 === o2;
  const skinP = appearanceForPlayer(p.playerAppearances, o1).building;
  const skinN = appearanceForPlayer(n.playerAppearances, o2).building;
  return skinP === skinN;
}

/** Здание поверх колец выделения (чтобы не перекрывалось белым кругом). */
export const TerritorySpotBuilding = memo(function TerritorySpotBuilding({
  map,
  index,
  hiddenOpts,
  localPlayerId,
  localDisplayColor,
  playerAppearances,
}: TerritorySpotBuildingProps): ReactElement | null {
  const spot = useMapSpotMetrics(map);
  if (isTerritoryIndexHidden(map, index, hiddenOpts)) return null;

  const pos = territoryCellPos(index);
  const cell = getCell(map, index);
  if (!cell.ownerId) return null;

  const { dotMidFillStyle } = cellStyles(
    cell,
    localPlayerId,
    localDisplayColor,
    playerAppearances
  );
  const buildingSkin = appearanceForPlayer(
    playerAppearances,
    cell.ownerId
  ).building;
  if (isGlbBuildingSkin(buildingSkin)) return null;

  const dotCenter = mapDotCenter(map, pos);

  return (
    <BuildingMarker
      skin={buildingSkin}
      cx={dotCenter.x}
      cy={dotCenter.y}
      size={spot.dotRadius}
      variant="neutral"
      fillStyle={dotMidFillStyle}
    />
  );
},
spotBuildingEqual);

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

function spotInteractiveEqual(
  p: TerritorySpotInteractiveProps,
  n: TerritorySpotInteractiveProps
): boolean {
  if (
    p.index !== n.index ||
    p.localPlayerId !== n.localPlayerId ||
    p.hoveredOwnIndex !== n.hoveredOwnIndex ||
    p.inMulti !== n.inMulti ||
    p.map.id !== n.map.id
  ) {
    return false;
  }
  if (p.hiddenOpts?.syncMapLayout !== n.hiddenOpts?.syncMapLayout) {
    return false;
  }
  const c1 = getCell(p.map, p.index);
  const c2 = getCell(n.map, p.index);
  return c1.ownerId === c2.ownerId && c1.units === c2.units;
}

/** Кольцо выделения + зона нажатия; обновляется при ховере/драге. */
export const TerritorySpotInteractive = memo(function TerritorySpotInteractive({
  map,
  index,
  hiddenOpts,
  localPlayerId,
  hoveredOwnIndex: _hoveredOwnIndex,
  inMulti,
  svgRef,
  setHoveredOwnIndex,
  setDrag,
}: TerritorySpotInteractiveProps): ReactElement | null {
  void _hoveredOwnIndex;
  const spot = useMapSpotMetrics(map);
  if (isTerritoryIndexHidden(map, index, hiddenOpts)) return null;

  const pos = territoryCellPos(index);
  const cell = getCell(map, index);
  const owner = cell.ownerId;
  const units = cell.units ?? 0;
  const canDragFrom = owner === localPlayerId && units > 0;
  if (!canDragFrom) return null;

  const ownHighlighted = inMulti;
  const ownRingR = spot.spotRingRadius;
  const ownHitR = spot.hitRadius;
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
},
spotInteractiveEqual);
