import type {
  CSSProperties,
  MutableRefObject,
  ReactElement,
  RefObject,
} from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  cellUnderCursorTerritoryDot,
  getCell,
  isTerritoryIndexHidden,
  mapDotCenter,
  mapSizeLabel,
  mapViewBoxString,
  territoryCellPos,
  type CellPos,
} from "../game/maps";
import type { TerritoryGameMap } from "../game/maps";
import { TERRITORY_DOT_RADIUS, TERRITORY_DOT_RING_PADDING } from "../game/mapLayout";
import { mapProjectileRadius } from "../game/maps/mapScale";
import type { LandHitFx } from "../game/hitEffects";
import { FirstMoveHintLayer } from "./map/FirstMoveHintLayer";
import { LandHitFxLayer } from "./map/LandHitFxLayer";
import type { PlayerAppearancesMap } from "../game/appearance";
import type { DisplayColorId } from "../game/appearance";
import {
  aimColorsForLocalPlayer,
  dotVariantForOwner,
  ownedDotFill,
  ownedTerritoryColorsForView,
} from "../game/playerColors";
import { AimArrowGroup } from "./map/AimArrowGroup";
import {
  MapProjectilesCanvas,
  type MapProjectilesCanvasHandle,
} from "./map/MapProjectilesCanvas";
import { TerritoryClipDefs } from "./map/TerritoryClipDefs";
import {
  TerritorySpotInteractive,
  TerritorySpotStatic,
  type DragState,
} from "./map/TerritoryMapSpotLayers";
import { TerritoryPaths } from "./map/TerritoryPaths";
import { type UnitDotVariant } from "./map/UnitDot";
import { clientPointToMapSpace } from "./map/svgCoords";
import styles from "./MapView.module.scss";

/** Обрезка стрелки прицела у точки отправления. */
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
  projectileCanvasRef: RefObject<MapProjectilesCanvasHandle | null>;
  playerAppearancesRef: MutableRefObject<PlayerAppearancesMap>;
  landHitFx?: readonly LandHitFx[];
  onCommitAttacks: (froms: readonly CellPos[], to: CellPos) => void;
  onCancelPendingFrom?: (cell: CellPos) => void;
  /** В комнате — только канонические скрытые точки карты (без localStorage). */
  syncMapLayout?: boolean;
  showFirstMoveHint?: boolean;
  firstMovePulseFromIndex?: number | null;
  mapInteractionLocked?: boolean;
};

function cellStyles(
  cell: ReturnType<typeof getCell>,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  playerAppearances?: PlayerAppearancesMap
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
        localDisplayColor,
        undefined,
        playerAppearances
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
          ownedDotFill(
            cell.ownerId ?? "",
            localPlayerId,
            localDisplayColor,
            playerAppearances
          ) ?? owned.fill,
      },
    };
  }
  return { fillClass: styles.territoryNeutral, dotVariant: "neutral" };
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

/** Начальная точка прицела при выборе всех своих (A): чуть в сторону центра карты от центроида сил. */
function defaultAimEndForSelectAll(
  map: TerritoryGameMap,
  sources: CellPos[]
): { x: number; y: number } {
  const vb = map.viewBox;
  const mapCx = vb.x + vb.width / 2;
  const mapCy = vb.y + vb.height / 2;
  if (sources.length === 0) {
    return { x: mapCx, y: mapCy };
  }
  let sx = 0;
  let sy = 0;
  for (const s of sources) {
    const p = mapDotCenter(map, s);
    sx += p.x;
    sy += p.y;
  }
  const n = sources.length;
  const mx = sx / n;
  const my = sy / n;
  const span = Math.min(vb.width, vb.height);
  const dx = mapCx - mx;
  const dy = mapCy - my;
  const len = Math.hypot(dx, dy) || 1;
  const step = span * 0.13;
  return { x: mx + (dx / len) * step, y: my + (dy / len) * step };
}

/** Красный прицел только на чужой/нейтральной клетке, не на своей. */
function isEnemyAimTarget(
  map: TerritoryGameMap,
  localId: string,
  target: CellPos
): boolean {
  const cell = getCell(map, target.x);
  return cell.ownerId !== localId;
}

export function TerritoryMapView({
  map,
  localPlayerId,
  localDisplayColor,
  activePlayerRef,
  playerAppearances,
  projectileCanvasRef,
  playerAppearancesRef,
  landHitFx = [],
  onCommitAttacks,
  onCancelPendingFrom,
  syncMapLayout = false,
  showFirstMoveHint = false,
  firstMovePulseFromIndex = null,
  mapInteractionLocked = false,
}: TerritoryMapViewProps) {
  const hiddenOpts = useMemo(
    () => (syncMapLayout ? { syncMapLayout: true as const } : undefined),
    [syncMapLayout]
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredOwnIndex, setHoveredOwnIndex] = useState<number | null>(null);
  const multiSourceIndices = useMemo(
    () => new Set(drag?.sources.map((s) => s.x) ?? []),
    [drag]
  );
  const { stroke: aimStroke, head: aimHead } = aimColorsForLocalPlayer(
    localPlayerId,
    localDisplayColor
  );
  const projR = mapProjectileRadius(map);
  const enemyAimRingR = TERRITORY_DOT_RADIUS + TERRITORY_DOT_RING_PADDING;

  const aimEnd = drag?.aimEnd ?? null;

  useEffect(() => {
    if (mapInteractionLocked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code !== "KeyA") return;
      const el = e.target;
      if (el instanceof HTMLElement) {
        const tag = el.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          tag === "BUTTON" ||
          el.isContentEditable
        ) {
          return;
        }
      }
      const allOwn: CellPos[] = [];
      for (let index = 0; index < map.territories.length; index++) {
        if (isTerritoryIndexHidden(map, index, hiddenOpts)) continue;
        const pos = territoryCellPos(index);
        if (isOwnWithUnits(map, localPlayerId, pos)) allOwn.push(pos);
      }
      if (allOwn.length === 0) return;
      e.preventDefault();
      const aim = defaultAimEndForSelectAll(map, allOwn);
      setDrag({
        sources: allOwn,
        hoverCell: cellUnderCursorTerritoryDot(map, aim.x, aim.y, hiddenOpts),
        aimEnd: aim,
      });
    };
    window.addEventListener("keydown", onKey, { capture: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [map, localPlayerId, hiddenOpts, mapInteractionLocked]);

  const hoverTargetValid = Boolean(
    drag &&
      drag.hoverCell &&
      isEnemyAimTarget(map, activePlayerRef.current, drag.hoverCell) &&
      multiAttackAllowed(
        map,
        activePlayerRef.current,
        drag.sources,
        drag.hoverCell
      )
  );
  const aimTargetIndex =
    hoverTargetValid && drag?.hoverCell ? drag.hoverCell.x : null;

  const territoryBacks = useMemo(() => {
    const backs: ReactElement[] = [];
    map.territories.forEach((territory, index) => {
      const cell = getCell(map, index);
      const { fillClass, fillStyle } = cellStyles(
        cell,
        localPlayerId,
        localDisplayColor,
        playerAppearances
      );
      backs.push(
        <g key={`${territory.id}-back`} data-x={index} data-y={0}>
          <TerritoryPaths
            paths={territory.paths}
            clipPathId={
              territory.clip ? `map-${map.id}-${territory.id}` : undefined
            }
            className={fillClass}
            style={fillStyle}
          />
        </g>
      );
    });
    return backs;
  }, [map, localPlayerId, localDisplayColor, playerAppearances]);

  const territoryDots = useMemo(
    () =>
      map.territories.map((territory, index) => (
        <g key={`${territory.id}-dots`} data-spot={index + 1}>
          <TerritorySpotStatic
            map={map}
            index={index}
            hiddenOpts={hiddenOpts}
            localPlayerId={localPlayerId}
            localDisplayColor={localDisplayColor}
            playerAppearances={playerAppearances}
            firstMovePulseFromIndex={firstMovePulseFromIndex}
          />
          <TerritorySpotInteractive
            map={map}
            index={index}
            hiddenOpts={hiddenOpts}
            localPlayerId={localPlayerId}
            hoveredOwnIndex={hoveredOwnIndex}
            inMulti={multiSourceIndices.has(index)}
            svgRef={svgRef}
            setHoveredOwnIndex={setHoveredOwnIndex}
            setDrag={setDrag}
          />
        </g>
      )),
    [
      map,
      hiddenOpts,
      localPlayerId,
      localDisplayColor,
      playerAppearances,
      firstMovePulseFromIndex,
      hoveredOwnIndex,
      multiSourceIndices,
    ]
  );

  const aimLines = useMemo(() => {
    if (!drag || !aimEnd) return [];
    const lines: ReactElement[] = [];
    for (const src of drag.sources) {
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
      lines.push(
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
    return lines;
  }, [drag, aimEnd, map, aimStroke, aimHead]);

  const enemyAimCenter =
    aimTargetIndex !== null
      ? mapDotCenter(map, territoryCellPos(aimTargetIndex))
      : null;

  return (
    <div className={styles.mapStack}>
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
        const hoverCell = cellUnderCursorTerritoryDot(
          map,
          pt.x,
          pt.y,
          hiddenOpts
        );
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
          ? cellUnderCursorTerritoryDot(map, pt.x, pt.y, hiddenOpts)
          : drag.hoverCell;
        const sourcesFinal = drag.sources;
        setDrag(null);
        setHoveredOwnIndex(null);
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
      onPointerCancel={() => {
        setDrag(null);
        setHoveredOwnIndex(null);
      }}
    >
      <TerritoryClipDefs
        prefix={`map-${map.id}`}
        territories={map.territories}
      />
      {territoryBacks}
      {enemyAimCenter ? (
        <circle
          className={styles.enemyAimRing}
          cx={enemyAimCenter.x}
          cy={enemyAimCenter.y}
          r={enemyAimRingR}
        />
      ) : null}
      {territoryDots}
      {aimLines}
      <LandHitFxLayer map={map} effects={landHitFx} projR={projR} />
      <FirstMoveHintLayer
        map={map}
        localPlayerId={localPlayerId}
        show={showFirstMoveHint}
        syncMapLayout={syncMapLayout}
      />
    </svg>
      <MapProjectilesCanvas
        ref={projectileCanvasRef}
        map={map}
        localPlayerId={localPlayerId}
        localDisplayColor={localDisplayColor}
        appearancesRef={playerAppearancesRef}
      />
    </div>
  );
}
