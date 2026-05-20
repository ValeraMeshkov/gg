import type {
  CSSProperties,
  MutableRefObject,
  ReactElement,
  RefObject,
} from "react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  cellUnderCursorTerritoryDot,
  getCell,
  isTerritoryIndexHidden,
  mapDotCenter,
  mapSizeLabel,
  mapViewBoxString,
  territoryCellPos,
  type CellPos,
} from "@/game/maps";
import type { TerritoryGameMap } from "@/game/maps";
import { MapSideBarPanel } from "@/components/map/MapSideBarPanel";
import { MapSideFighterPicker } from "@/components/map/MapSideFighterPicker";
import { mapCursorCss } from "@/game/mapCursor";
import {
  computeMapSpotMetrics,
  computeMapSpotMetricsFallback,
} from "@/game/maps/mapSpotMetrics";
import { mapProjectileRadiusFromDotRadius } from "@/game/maps/mapScale";
import { useMapSvgSize } from "@/hooks/useMapSvgSize";
import type { LandHitFx } from "@/game/hitEffects";
import type { FighterSkinId, PlayerAppearancesMap } from "@/game/appearance";
import type { DisplayColorId } from "@/game/appearance";
import {
  aimColorsForLocalPlayer,
  dotVariantForOwner,
  ownedDotFill,
  ownedTerritoryColorsForView,
} from "@/game/playerColors";
import { collectHeartLifeChains } from "@/components/map/heartLife/collectHeartLifeLinks";
import { buildHeartLinkRevision } from "@/components/map/heartLife/heartLinkRevision";
import { HeartLifeLinksG } from "@/components/map/heartLife/HeartLifeLinksG";
import {
  AimArrowGroup,
  BuildingGlbOverlay,
  clientPointToMapSpace,
  FirstMoveHintLayer,
  LandHitFxLayer,
  MapProjectilesCanvas,
  MapSpotMetricsProvider,
  TerritoryClipDefs,
  TerritoryPaths,
  TerritorySpotBuilding,
  TerritorySpotInteractive,
  TerritorySpotStatic,
  type DragState,
  type MapProjectilesCanvasHandle,
  type UnitDotVariant,
} from "@/components/map";
import styles from "@/components/map/styles/MapView.module.scss";

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
  onCancelAllPending?: () => void;
  /** В комнате — только канонические скрытые точки карты (без localStorage). */
  syncMapLayout?: boolean;
  showFirstMoveHint?: boolean;
  mapInteractionLocked?: boolean;
  fighterPickerDisabled?: boolean;
  onMapFlightMetricsChange?: (metrics: {
    meetScale: number;
    dotRadius: number;
  }) => void;
  offlineBotCount?: number;
  onOfflineBotCountChange?: (value: number) => void;
  onOfflineBotCountCommit?: (value: number) => void;
  offlineBotDifficulty?: number;
  onOfflineBotDifficultyChange?: (value: number) => void;
  fighter: FighterSkinId;
  onFighterChange: (fighter: FighterSkinId) => void;
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  mapCatalogDisabled?: boolean;
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  randomMapLabel?: string;
  /** Соло: выбор карты в центральном доке — не дублировать блок «Карта» сбоку. */
  hideSideMapPicker?: boolean;
  /** Соло: хоткеи показываются в центральном доке. */
  hideSideHotkeys?: boolean;
  /** Соло: число ботов/сложность показываются в центральном доке. */
  hideSideSoloControls?: boolean;
};

function isMapHotkeyTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  ) {
    return true;
  }
  return tag === "BUTTON" && !el.dataset.mapAction;
}

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

/** Источники прицела, которые ещё принадлежат игроку и могут стрелять. */
function filterOwnDragSources(
  map: TerritoryGameMap,
  playerId: string,
  sources: readonly CellPos[]
): CellPos[] {
  return sources.filter((s) => isOwnWithUnits(map, playerId, s));
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

const TOP_OWN_SELECT_COUNT = 1;

/** До `maxCount` своих точек с наибольшим числом юнитов. */
function topOwnTerritoriesByUnits(
  map: TerritoryGameMap,
  localId: string,
  maxCount: number,
  hiddenOpts?: Parameters<typeof isTerritoryIndexHidden>[2]
): CellPos[] {
  const ranked: { pos: CellPos; units: number }[] = [];
  for (let index = 0; index < map.territories.length; index++) {
    if (isTerritoryIndexHidden(map, index, hiddenOpts)) continue;
    const cell = getCell(map, index);
    if (cell.ownerId !== localId) continue;
    const units = cell.units ?? 0;
    if (units <= 0) continue;
    ranked.push({ pos: territoryCellPos(index), units });
  }
  ranked.sort((a, b) => b.units - a.units || a.pos.x - b.pos.x);
  return ranked.slice(0, maxCount).map((e) => e.pos);
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

/** Красное кольцо прицела — только не на своей точке. */
function isAimTargetCell(
  map: TerritoryGameMap,
  localId: string,
  target: CellPos | null
): boolean {
  if (!target) return false;
  return getCell(map, target.x).ownerId !== localId;
}

export const TerritoryMapView = memo(function TerritoryMapView({
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
  onCancelAllPending,
  syncMapLayout = false,
  showFirstMoveHint = false,
  mapInteractionLocked = false,
  fighterPickerDisabled,
  onMapFlightMetricsChange,
  offlineBotCount,
  onOfflineBotCountChange,
  onOfflineBotCountCommit,
  offlineBotDifficulty,
  onOfflineBotDifficultyChange,
  fighter,
  onFighterChange,
  mapId,
  onMapIdChange,
  mapSelectHint,
  mapCatalogDisabled = false,
  randomMapOnStart,
  onRandomMapOnStartChange,
  randomMapLabel,
  hideSideMapPicker = true,
  hideSideHotkeys = true,
  hideSideSoloControls = true,
}: TerritoryMapViewProps) {
  const showSoloControls =
    offlineBotCount != null &&
    onOfflineBotCountChange != null &&
    onOfflineBotCountCommit != null &&
    offlineBotDifficulty != null &&
    onOfflineBotDifficultyChange != null;
  /** Левая нижняя панель: только если в ней есть секции (в соло всё перенесено в док — не показывать пустую полоску). */
  const showMapSideBar =
    !hideSideMapPicker ||
    (showSoloControls && !hideSideSoloControls) ||
    !hideSideHotkeys;
  const [mapSidePanelOpen, setMapSidePanelOpen] = useState(true);
  const hiddenOpts = useMemo(
    () => (syncMapLayout ? { syncMapLayout: true as const } : undefined),
    [syncMapLayout]
  );
  const heartLinkRevision = useMemo(
    () => buildHeartLinkRevision(map, playerAppearances, hiddenOpts),
    [map, playerAppearances, hiddenOpts]
  );
  const heartLifeChains = useMemo(
    () =>
      collectHeartLifeChains(
        map,
        localPlayerId,
        localDisplayColor,
        playerAppearances,
        hiddenOpts
      ),
    [
      heartLinkRevision,
      localPlayerId,
      localDisplayColor,
      playerAppearances,
      hiddenOpts,
    ]
  );
  const svgRef = useRef<SVGSVGElement>(null);
  /** Последняя позиция курсора в координатах карты (для A — прицел под мышью). */
  const lastPointerMapRef = useRef<{ x: number; y: number } | null>(null);
  const svgSize = useMapSvgSize(svgRef, map.id);
  const spotMetrics = useMemo(() => {
    if (svgSize.width > 0 && svgSize.height > 0) {
      return computeMapSpotMetrics(map, svgSize.width, svgSize.height);
    }
    return computeMapSpotMetricsFallback(map);
  }, [map, svgSize.width, svgSize.height]);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoveredOwnIndex, setHoveredOwnIndex] = useState<number | null>(null);
  const dragActive = useMemo((): DragState | null => {
    if (!drag) return null;
    const sources = filterOwnDragSources(map, localPlayerId, drag.sources);
    if (sources.length === 0) return null;
    if (sources.length === drag.sources.length) return drag;
    return { ...drag, sources };
  }, [drag, map, localPlayerId]);
  useEffect(() => {
    if (!drag) return;
    const sources = filterOwnDragSources(map, localPlayerId, drag.sources);
    if (sources.length === 0) {
      setDrag(null);
      return;
    }
    if (sources.length < drag.sources.length) {
      setDrag((d) => (d ? { ...d, sources } : null));
    }
  }, [map, drag, localPlayerId]);
  const multiSourceIndices = useMemo(
    () => new Set(dragActive?.sources.map((s) => s.x) ?? []),
    [dragActive]
  );
  const { stroke: aimStroke, head: aimHead } = aimColorsForLocalPlayer(
    localPlayerId,
    localDisplayColor
  );
  const projR = mapProjectileRadiusFromDotRadius(spotMetrics.dotRadius);
  const aimEnd = dragActive?.aimEnd ?? null;
  const dotR = spotMetrics.dotRadius;
  const aimRingR = spotMetrics.spotRingRadius;
  const arrowTrim = dotR + 3;

  useEffect(() => {
    onMapFlightMetricsChange?.({
      meetScale: spotMetrics.meetScale,
      dotRadius: spotMetrics.dotRadius,
    });
  }, [
    spotMetrics.meetScale,
    spotMetrics.dotRadius,
    onMapFlightMetricsChange,
  ]);

  const aimTargetValid = Boolean(
    dragActive &&
      dragActive.hoverCell &&
      isAimTargetCell(map, activePlayerRef.current, dragActive.hoverCell) &&
      multiAttackAllowed(
        map,
        activePlayerRef.current,
        dragActive.sources,
        dragActive.hoverCell
      )
  );
  const aimTargetIndex =
    aimTargetValid && dragActive?.hoverCell ? dragActive.hoverCell.x : null;
  const aimTargetCenter =
    aimTargetIndex !== null
      ? mapDotCenter(map, territoryCellPos(aimTargetIndex))
      : null;

  const dragHoverOwnIndex = useMemo(() => {
    const hc = dragActive?.hoverCell;
    if (hc == null || !isOwnWithUnits(map, localPlayerId, hc)) return null;
    return hc.x;
  }, [dragActive, map, localPlayerId]);

  const pickCellAt = useCallback(
    (mapX: number, mapY: number) =>
      cellUnderCursorTerritoryDot(
        map,
        mapX,
        mapY,
        hiddenOpts,
        spotMetrics.hitRadius
      ),
    [map, hiddenOpts, spotMetrics.hitRadius]
  );

  const syncHoveredOwnFromPointer = useCallback(
    (pt: { x: number; y: number } | null) => {
      if (drag) return;
      if (!pt) {
        setHoveredOwnIndex(null);
        return;
      }
      const hover = pickCellAt(pt.x, pt.y);
      if (hover && isOwnWithUnits(map, localPlayerId, hover)) {
        setHoveredOwnIndex(hover.x);
      } else {
        setHoveredOwnIndex(null);
      }
    },
    [drag, map, localPlayerId, pickCellAt]
  );

  const trackPointerOnMap = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const pt = clientPointToMapSpace(svg, clientX, clientY);
      if (pt) {
        lastPointerMapRef.current = pt;
        syncHoveredOwnFromPointer(pt);
      }
      return pt;
    },
    [syncHoveredOwnFromPointer]
  );

  const selectAllOwnTerritories = useCallback(() => {
    const allOwn: CellPos[] = [];
    for (let index = 0; index < map.territories.length; index++) {
      if (isTerritoryIndexHidden(map, index, hiddenOpts)) continue;
      const pos = territoryCellPos(index);
      if (isOwnWithUnits(map, localPlayerId, pos)) allOwn.push(pos);
    }
    if (allOwn.length === 0) return;
    const aim =
      lastPointerMapRef.current ?? defaultAimEndForSelectAll(map, allOwn);
    setDrag({
      sources: allOwn,
      hoverCell: pickCellAt(aim.x, aim.y),
      aimEnd: aim,
    });
  }, [map, localPlayerId, hiddenOpts, pickCellAt]);

  const selectTopOwnTerritoriesByUnits = useCallback(() => {
    const topOwn = topOwnTerritoriesByUnits(
      map,
      localPlayerId,
      TOP_OWN_SELECT_COUNT,
      hiddenOpts
    );
    if (topOwn.length === 0) return;
    const aim =
      lastPointerMapRef.current ?? defaultAimEndForSelectAll(map, topOwn);
    setDrag({
      sources: topOwn,
      hoverCell: pickCellAt(aim.x, aim.y),
      aimEnd: aim,
    });
  }, [map, localPlayerId, hiddenOpts, pickCellAt]);

  const cancelAimAndPending = useCallback(() => {
    setDrag(null);
    setHoveredOwnIndex(null);
    onCancelAllPending?.();
  }, [onCancelAllPending]);

  useEffect(() => {
    if (mapInteractionLocked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isMapHotkeyTarget(e.target)) return;
      if (e.code === "KeyA") {
        e.preventDefault();
        selectAllOwnTerritories();
        return;
      }
      if (e.code === "KeyD") {
        e.preventDefault();
        selectTopOwnTerritoriesByUnits();
        return;
      }
      if (e.code === "KeyS") {
        e.preventDefault();
        cancelAimAndPending();
      }
    };
    window.addEventListener("keydown", onKey, { capture: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [
    mapInteractionLocked,
    selectAllOwnTerritories,
    selectTopOwnTerritoriesByUnits,
    cancelAimAndPending,
  ]);

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
            aimTargetIndex={aimTargetIndex}
          />
          <TerritorySpotInteractive
            map={map}
            index={index}
            hiddenOpts={hiddenOpts}
            localPlayerId={localPlayerId}
            hoveredOwnIndex={hoveredOwnIndex}
            dragHoverOwnIndex={dragHoverOwnIndex}
            inMulti={multiSourceIndices.has(index)}
            svgRef={svgRef}
            setHoveredOwnIndex={setHoveredOwnIndex}
            setDrag={setDrag}
          />
          <TerritorySpotBuilding
            map={map}
            index={index}
            hiddenOpts={hiddenOpts}
            localPlayerId={localPlayerId}
            localDisplayColor={localDisplayColor}
            playerAppearances={playerAppearances}
          />
        </g>
      )),
    [
      map,
      hiddenOpts,
      localPlayerId,
      localDisplayColor,
      playerAppearances,
      aimTargetIndex,
      hoveredOwnIndex,
      dragHoverOwnIndex,
      multiSourceIndices,
    ]
  );

  const aimLines = useMemo(() => {
    if (!dragActive || !aimEnd) return [];
    const lines: ReactElement[] = [];
    for (const src of dragActive.sources) {
      const start = mapDotCenter(map, src);
      const seg = trimmedAimSegment(
        start.x,
        start.y,
        aimEnd.x,
        aimEnd.y,
        arrowTrim,
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
  }, [dragActive, aimEnd, map, aimStroke, aimHead, arrowTrim]);

  const mapCursor = useMemo(() => {
    if (drag) return mapCursorCss("grabbing");
    if (hoveredOwnIndex !== null) return "pointer";
    return mapCursorCss("crosshair");
  }, [drag, hoveredOwnIndex]);

  return (
    <MapSpotMetricsProvider metrics={spotMetrics}>
    <div
      className={styles.mapStack}
      style={{ cursor: mapCursor }}
      onPointerMove={(e) => {
        trackPointerOnMap(e.clientX, e.clientY);
      }}
      onPointerLeave={() => {
        if (!drag) setHoveredOwnIndex(null);
      }}
    >
      {showMapSideBar ? (
        <MapSideBarPanel
          open={mapSidePanelOpen}
          onOpenChange={setMapSidePanelOpen}
          mapId={mapId}
          onMapIdChange={onMapIdChange}
          mapSelectHint={mapSelectHint}
          mapCatalogDisabled={mapCatalogDisabled}
          randomMapOnStart={randomMapOnStart}
          onRandomMapOnStartChange={onRandomMapOnStartChange}
          randomMapLabel={randomMapLabel}
          hideMapPicker={hideSideMapPicker}
          showSoloControls={showSoloControls}
          hideSoloControls={hideSideSoloControls}
          offlineBotCount={offlineBotCount ?? 0}
          onOfflineBotCountChange={onOfflineBotCountChange ?? (() => {})}
          onOfflineBotCountCommit={onOfflineBotCountCommit}
          offlineBotDifficulty={offlineBotDifficulty ?? 0}
          onOfflineBotDifficultyChange={
            onOfflineBotDifficultyChange ?? (() => {})
          }
          hideHotkeys={hideSideHotkeys}
          mapInteractionLocked={mapInteractionLocked}
          onSelectAllOwn={selectAllOwnTerritories}
          onSelectTopOwn={selectTopOwnTerritoriesByUnits}
          onCancelAimAndPending={cancelAimAndPending}
        />
      ) : null}
      <aside className={styles.mapFighterRail}>
        <MapSideFighterPicker
          fighter={fighter}
          onFighterChange={onFighterChange}
          disabled={fighterPickerDisabled ?? mapInteractionLocked}
        />
      </aside>
      <svg
        ref={svgRef}
        className={styles.svg}
      viewBox={mapViewBoxString(map)}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Карта ${map.name}, ${mapSizeLabel(map)}`}
      style={{ touchAction: "none", cursor: mapCursor }}
      onPointerMove={(e) => {
        const pt = trackPointerOnMap(e.clientX, e.clientY);
        if (!drag || !pt) return;
        const hoverCell = pickCellAt(pt.x, pt.y);
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
        const sourcesFinal = filterOwnDragSources(
          map,
          localPlayerId,
          drag.sources
        );
        const playerId = activePlayerRef.current;
        const picked = pt ? pickCellAt(pt.x, pt.y) : null;
        let targetCell = picked;
        if (
          !targetCell &&
          drag.hoverCell &&
          isAimTargetCell(map, playerId, drag.hoverCell) &&
          multiAttackAllowed(map, playerId, sourcesFinal, drag.hoverCell)
        ) {
          targetCell = drag.hoverCell;
        }
        setDrag(null);
        setHoveredOwnIndex(null);
        if (!targetCell) return;

        const sole = sourcesFinal.length === 1 ? sourcesFinal[0] ?? null : null;
        if (
          sole &&
          sole.x === targetCell.x &&
          isOwnWithUnits(map, playerId, sole)
        ) {
          onCancelPendingFrom?.(sole);
          return;
        }

        if (!multiAttackAllowed(map, playerId, sourcesFinal, targetCell)) return;
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
      <HeartLifeLinksG chains={heartLifeChains} />
      {aimTargetCenter ? (
        <g aria-hidden>
          <circle
            className={styles.aimTargetFill}
            cx={aimTargetCenter.x}
            cy={aimTargetCenter.y}
            r={aimRingR}
          />
          <circle
            className={`${styles.spotIndicatorRing} ${styles.aimTargetRing}`}
            cx={aimTargetCenter.x}
            cy={aimTargetCenter.y}
            r={aimRingR}
          />
        </g>
      ) : null}
      {territoryDots}
      {aimLines}
      <LandHitFxLayer effects={landHitFx} projR={projR} />
      <FirstMoveHintLayer
        map={map}
        localPlayerId={localPlayerId}
        show={showFirstMoveHint}
        syncMapLayout={syncMapLayout}
      />
    </svg>
      <BuildingGlbOverlay
        map={map}
        localPlayerId={localPlayerId}
        localDisplayColor={localDisplayColor}
        playerAppearances={playerAppearances}
        syncMapLayout={syncMapLayout}
        svgRef={svgRef}
      />
      <MapProjectilesCanvas
        ref={projectileCanvasRef}
        map={map}
        localPlayerId={localPlayerId}
        localDisplayColor={localDisplayColor}
        appearancesRef={playerAppearancesRef}
      />
    </div>
    </MapSpotMetricsProvider>
  );
});
