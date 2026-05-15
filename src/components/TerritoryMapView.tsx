import type { CSSProperties, MutableRefObject, ReactElement } from "react";
import { useRef, useState } from "react";
import { SHOT } from "../game/constants";
import {
  getCell,
  isTerritoryIndexHidden,
  mapDotCenter,
  mapSizeLabel,
  mapViewBoxString,
  type CellPos,
} from "../game/maps";
import type { TerritoryGameMap } from "../game/maps";
import {
  TERRITORY_DOT_RADIUS,
  TERRITORY_LABEL_FONT,
  TERRITORY_LABEL_OFFSET_Y,
} from "../game/mapLayout";
import {
  mapExplosionFlashGrow,
  mapExplosionRingBase,
  mapExplosionRingGrow,
  mapProjectileRadius,
  mapTargetGlowRadius,
} from "../game/maps/mapScale";
import { appearanceForPlayer, type PlayerAppearancesMap } from "../game/appearance";
import type { DisplayColorId } from "../game/appearance";
import {
  aimColorsForLocalPlayer,
  dotVariantForOwner,
  ownedDotFill,
  ownedTerritoryColorsForView,
  projectileColorsForView,
} from "../game/playerColors";
import { AimArrowGroup } from "./map/AimArrowGroup";
import { BuildingMarker } from "./map/BuildingMarker";
import { FighterShape } from "./map/FighterShape";
import { TerritoryPaths } from "./map/TerritoryPaths";
import { type UnitDotVariant } from "./map/UnitDot";
import { clientPointToMapSpace } from "./map/svgCoords";
import styles from "./MapView.module.scss";

const DOT_HIT_EXTRA = 5;
const ARROW_TRIM = TERRITORY_DOT_RADIUS + 3;

function trimmedAimSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  trimStart: number,
  trimEnd: number
): { x1: number; y1: number; x2: number; y2: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < trimStart + trimEnd + 12) return null;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * trimStart,
    y1: y1 + uy * trimStart,
    x2: x2 - ux * trimEnd,
    y2: y2 - uy * trimEnd,
  };
}

type TerritoryMapViewProps = {
  map: TerritoryGameMap;
  localPlayerId: string;
  /** Личный цвет территории и пуль — только на этом экране. */
  localDisplayColor?: DisplayColorId;
  activePlayerRef: MutableRefObject<string>;
  playerAppearances: PlayerAppearancesMap;
  projectiles: readonly {
    id: string;
    x: number;
    y: number;
    angle: number;
    attackerId: string;
  }[];
  explosions?: readonly { id: string; x: number; y: number; start: number }[];
  onCommitAttacks: (froms: readonly CellPos[], to: CellPos) => void;
  onCancelPendingFrom?: (cell: CellPos) => void;
  /** В комнате — только канонические скрытые точки карты (без localStorage). */
  syncMapLayout?: boolean;
};

function cellStyles(
  cell: ReturnType<typeof getCell>,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): {
  fillClass: string;
  fillStyle?: CSSProperties;
  dotVariant: UnitDotVariant;
  dotMidFillStyle?: CSSProperties;
} {
  const units = cell.units ?? 0;
  const owned = cell.ownerId
    ? ownedTerritoryColorsForView(
        cell.ownerId,
        localPlayerId,
        units,
        localDisplayColor
      )
    : null;
  if (owned) {
    return {
      fillClass: styles.territoryOwned,
      fillStyle: { fill: owned.fill, stroke: owned.stroke },
      dotVariant: dotVariantForOwner(
        cell.ownerId,
        localPlayerId,
        localDisplayColor
      ),
      dotMidFillStyle: {
        fill:
          ownedDotFill(cell.ownerId ?? "", localPlayerId, localDisplayColor) ??
          owned.fill,
      },
    };
  }
  return { fillClass: styles.territoryNeutral, dotVariant: "neutral" };
}

function cellPos(index: number): CellPos {
  return { x: index, y: 0 };
}

function cellKey(c: CellPos): string {
  return String(c.x);
}

function canAttackTarget(from: CellPos, to: CellPos): boolean {
  return from.x !== to.x || from.y !== to.y;
}

function isOwnWithUnits(
  map: TerritoryGameMap,
  localId: string,
  c: CellPos
): boolean {
  const cell = getCell(map, c.x);
  return cell.ownerId === localId && (cell.units ?? 0) > 0;
}

function cellUnderCursorDot(
  map: TerritoryGameMap,
  mapX: number,
  mapY: number,
  hiddenOpts?: { syncMapLayout?: boolean }
): CellPos | null {
  const hitR = TERRITORY_DOT_RADIUS + DOT_HIT_EXTRA;
  let bestIndex: number | null = null;
  let bestD = Infinity;
  for (let index = 0; index < map.territories.length; index++) {
    if (isTerritoryIndexHidden(map, index, hiddenOpts)) continue;
    const c = mapDotCenter(map, cellPos(index));
    const d = Math.hypot(mapX - c.x, mapY - c.y);
    if (d <= hitR && d < bestD) {
      bestD = d;
      bestIndex = index;
    }
  }
  return bestIndex !== null ? cellPos(bestIndex) : null;
}

function sourcesExcludingTarget(
  sources: readonly CellPos[],
  target: CellPos
): CellPos[] {
  return sources.filter((s) => s.x !== target.x);
}

function multiAttackAllowed(
  _map: TerritoryGameMap,
  _localId: string,
  sources: CellPos[],
  target: CellPos
): boolean {
  const shooters = sourcesExcludingTarget(sources, target);
  if (shooters.length === 0) return false;
  return shooters.every((s) => canAttackTarget(s, target));
}

type DragState = {
  sources: CellPos[];
  hoverCell: CellPos | null;
  aimEnd: { x: number; y: number };
};

export function TerritoryMapView({
  map,
  localPlayerId,
  localDisplayColor,
  activePlayerRef,
  playerAppearances,
  projectiles,
  explosions = [],
  onCommitAttacks,
  onCancelPendingFrom,
  syncMapLayout = false,
}: TerritoryMapViewProps) {
  const hiddenOpts = syncMapLayout ? { syncMapLayout: true as const } : undefined;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const { stroke: aimStroke, head: aimHead } = aimColorsForLocalPlayer(
    localPlayerId,
    localDisplayColor
  );
  const projR = mapProjectileRadius(map);
  const glowR = mapTargetGlowRadius(map);

  const activeSources = drag?.sources ?? [];
  const aimEnd = drag?.aimEnd ?? null;

  const territoryBacks: ReactElement[] = [];
  const territoryDots: ReactElement[] = [];

  map.territories.forEach((territory, index) => {
    const hidden = isTerritoryIndexHidden(map, index, hiddenOpts);
    const pos = cellPos(index);
    const cell = getCell(map, index);
    const { fillClass, fillStyle, dotVariant, dotMidFillStyle } = cellStyles(
      cell,
      localPlayerId,
      localDisplayColor
    );
    const units = cell.units ?? 0;
    const owner = cell.ownerId;
    const canDragFrom = owner === localPlayerId && units > 0;
    const inMulti = activeSources.some((s) => s.x === index);

    territoryBacks.push(
      <g key={`${territory.id}-back`} data-x={index} data-y={0}>
        <TerritoryPaths
          clipIdPrefix={`map-${map.id}`}
          territoryId={territory.id}
          paths={territory.paths}
          clip={territory.clip}
          className={`${fillClass}${
            inMulti ? ` ${styles.territoryMultiSelect}` : ""
          }`}
          style={fillStyle}
        />
      </g>
    );

    if (hidden) return;

    const dotCenter = mapDotCenter(map, pos);
    const buildingSkin = owner
      ? appearanceForPlayer(playerAppearances, owner).building
      : "circle";
    territoryDots.push(
      <g key={`${territory.id}-dots`} data-spot={index + 1}>
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
        {canDragFrom ? (
          <circle
            className={styles.dotHit}
            cx={dotCenter.x}
            cy={dotCenter.y}
            r={TERRITORY_DOT_RADIUS + DOT_HIT_EXTRA}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              svgRef.current?.setPointerCapture(e.pointerId);
              const svg = svgRef.current;
              const pt = svg
                ? clientPointToMapSpace(svg, e.clientX, e.clientY)
                : null;
              const aim = pt ?? dotCenter;
              setDrag({
                sources: [pos],
                hoverCell: cellUnderCursorDot(map, aim.x, aim.y, hiddenOpts),
                aimEnd: aim,
              });
            }}
          />
        ) : null}
      </g>
    );
  });

  const aimLines: ReactElement[] = [];
  if (drag && aimEnd) {
    for (const src of activeSources) {
      const start = mapDotCenter(map, src);
      const seg = trimmedAimSegment(
        start.x,
        start.y,
        aimEnd.x,
        aimEnd.y,
        ARROW_TRIM,
        0
      );
      if (!seg) continue;
      aimLines.push(
        <AimArrowGroup
          key={`aim-${cellKey(src)}`}
          seg={seg}
          stroke={aimStroke}
          head={aimHead}
          shaftWidth={10}
          tipLead={4}
          headDepth={18}
          headHalf={10}
        />
      );
    }
  }

  const hoverTargetValid =
    drag &&
    drag.hoverCell &&
    multiAttackAllowed(
      map,
      activePlayerRef.current,
      drag.sources,
      drag.hoverCell
    );

  const glowCenter =
    hoverTargetValid && drag.hoverCell
      ? mapDotCenter(map, drag.hoverCell)
      : null;

  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      viewBox={mapViewBoxString(map)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Карта ${map.name}, ${mapSizeLabel(map)}`}
      style={{ touchAction: "none" }}
      onPointerMove={(e) => {
        if (!drag || !svgRef.current) return;
        const pt = clientPointToMapSpace(svgRef.current, e.clientX, e.clientY);
        if (!pt) return;
        const hoverCell = cellUnderCursorDot(map, pt.x, pt.y, hiddenOpts);
        setDrag((d) => {
          if (!d) return d;
          let sources = d.sources;
          if (
            hoverCell &&
            isOwnWithUnits(map, activePlayerRef.current, hoverCell) &&
            !sources.some((s) => s.x === hoverCell.x)
          ) {
            sources = [...sources, hoverCell];
          }
          return { ...d, sources, hoverCell, aimEnd: pt };
        });
      }}
      onPointerUp={(e) => {
        if (!drag || !svgRef.current) return;
        try {
          svgRef.current.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        const pt = clientPointToMapSpace(svgRef.current, e.clientX, e.clientY);
        const targetCell = pt
          ? cellUnderCursorDot(map, pt.x, pt.y, hiddenOpts)
          : drag.hoverCell;
        const sourcesFinal = drag.sources;
        setDrag(null);
        if (!targetCell) return;

        const sole = sourcesFinal.length === 1 ? sourcesFinal[0] ?? null : null;
        if (
          sole &&
          sole.x === targetCell.x &&
          isOwnWithUnits(map, activePlayerRef.current, sole)
        ) {
          onCancelPendingFrom?.(sole);
          return;
        }

        if (
          !multiAttackAllowed(
            map,
            activePlayerRef.current,
            sourcesFinal,
            targetCell
          )
        )
          return;
        onCommitAttacks(
          sourcesExcludingTarget(sourcesFinal, targetCell),
          targetCell
        );
      }}
      onPointerCancel={() => setDrag(null)}
    >
      {territoryBacks}
      {glowCenter ? (
        <circle
          className={styles.targetGlowTerritory}
          cx={glowCenter.x}
          cy={glowCenter.y}
          r={glowR}
        />
      ) : null}
      <g aria-hidden>
        {projectiles.map((p) => {
          const { fill } = projectileColorsForView(
            p.attackerId,
            localPlayerId,
            localDisplayColor
          );
          const fighterSkin = appearanceForPlayer(
            playerAppearances,
            p.attackerId
          ).fighter;
          return (
            <FighterShape
              key={p.id}
              className={styles.projectile}
              skin={fighterSkin}
              x={p.x}
              y={p.y}
              angle={p.angle}
              size={projR}
              fill={fill}
            />
          );
        })}
      </g>
      {territoryDots}
      {aimLines}
      <g aria-hidden>
        {explosions.map((e) => {
          const phase = Math.min(
            1,
            (performance.now() - e.start) / SHOT.explosionDurationMs
          );
          const rFlash = projR + phase * mapExplosionFlashGrow(map);
          const op = (1 - phase) * 0.92;
          const rRing =
            mapExplosionRingBase(map) + phase * mapExplosionRingGrow(map);
          return (
            <g key={e.id} className={styles.explosion}>
              <circle
                className={styles.explosionFlash}
                cx={e.x}
                cy={e.y}
                r={rFlash}
                opacity={op}
              />
              <circle
                className={styles.explosionRing}
                cx={e.x}
                cy={e.y}
                r={rRing}
                fill="none"
                stroke="#ff6f00"
                strokeWidth={2}
                opacity={op * 0.75}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
