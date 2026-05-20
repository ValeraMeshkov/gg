import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  computeMapSpotMetrics,
  computeMapSpotMetricsFallback,
} from "@/game/maps/mapSpotMetrics";
import { useMapSvgSize } from "@/hooks/useMapSvgSize";
import {
  getMapCatalogEntry,
  mapAspectRatio,
  mapViewBoxString,
  MAP_CATALOG,
  requireMap,
  type TerritoryGameMap,
} from "@/game/maps";
import {
  getEffectiveLayout,
  loadMapDotLayout,
  layoutToTerritoryDots,
  saveMapDotLayout,
  territoryOriginalCenter,
  type DotPositionsBySpot,
  type MapDotLayout,
} from "@/game/maps/world/mapDotLayout";
import { gameHref } from "@/appUrl";
import {
  clientPointToMapSpace,
  TerritoryClipDefs,
  TerritoryPaths,
  UnitDot,
} from "@/components/map";
import mapStyles from "@/components/map/styles/MapView.module.scss";
import styles from "./MapDotEditor.module.scss";

type MapDotEditorProps = {
  mapId: string;
  onMapIdChange: (mapId: string) => void;
};

function initialPositions(map: TerritoryGameMap): DotPositionsBySpot {
  return { ...getEffectiveLayout(map).positions };
}

function initialHidden(map: TerritoryGameMap): Set<number> {
  return new Set(getEffectiveLayout(map).hiddenSpots);
}

export function MapDotEditor({ mapId, onMapIdChange }: MapDotEditorProps) {
  const baseMap = requireMap(mapId);
  if (baseMap.kind !== "territory") {
    throw new Error(
      `Редактор точек только для карт континентов, получено: ${mapId}`
    );
  }
  const territoryMap = baseMap;

  const [positions, setPositions] = useState<DotPositionsBySpot>(() =>
    initialPositions(territoryMap)
  );
  const [hiddenSpots, setHiddenSpots] = useState<Set<number>>(() =>
    initialHidden(territoryMap)
  );
  const [selectedSpot, setSelectedSpot] = useState(1);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draggingSpot, setDraggingSpot] = useState<number | null>(null);
  const [showHiddenOnMap, setShowHiddenOnMap] = useState(
    () => loadMapDotLayout(mapId)?.showHiddenOnMap !== false
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const svgSize = useMapSvgSize(svgRef, mapId);
  const spotMetrics = useMemo(() => {
    if (svgSize.width > 0 && svgSize.height > 0) {
      return computeMapSpotMetrics(territoryMap, svgSize.width, svgSize.height);
    }
    return computeMapSpotMetricsFallback(territoryMap);
  }, [territoryMap, svgSize.width, svgSize.height]);

  useEffect(() => {
    const m = requireMap(mapId);
    if (m.kind !== "territory") return;
    setPositions(initialPositions(m));
    setHiddenSpots(initialHidden(m));
    setShowHiddenOnMap(loadMapDotLayout(mapId)?.showHiddenOnMap !== false);
    setSelectedSpot(1);
    setSaveMsg(null);
    setErrorMsg(null);
  }, [mapId]);

  const layout = useMemo((): MapDotLayout => {
    return {
      version: 1,
      positions,
      hiddenSpots: [...hiddenSpots].sort((a, b) => a - b),
      showHiddenOnMap,
    };
  }, [positions, hiddenSpots, showHiddenOnMap]);

  const catalog = getMapCatalogEntry(mapId);
  const selectedIndex = selectedSpot - 1;
  const selectedTerritory = territoryMap.territories[selectedIndex];
  const selectedPos = positions[selectedSpot];
  const isHidden = hiddenSpots.has(selectedSpot);

  const persistLayout = useCallback(() => {
    saveMapDotLayout(mapId, layout);
    setSaveMsg("Сохранено в браузер — обновите игру или откройте её заново.");
    setErrorMsg(null);
  }, [mapId, layout]);

  const writeToCode = useCallback(async () => {
    setErrorMsg(null);
    setSaveMsg(null);
    const dots = layoutToTerritoryDots(territoryMap, layout);
    try {
      const res = await fetch("/api/dot-layout/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapId,
          dots,
          hiddenSpots: layout.hiddenSpots,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        filePath?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setSaveMsg(`Записано в код: ${data.filePath ?? "generated"}`);
    } catch (e) {
      setErrorMsg(
        e instanceof Error
          ? `${e.message} (работает только при npm run dev)`
          : "Ошибка записи в код"
      );
    }
  }, [mapId, layout, territoryMap]);

  const restoreSpot = useCallback((spot: number) => {
    setHiddenSpots((prev) => {
      const next = new Set(prev);
      next.delete(spot);
      return next;
    });
    setSelectedSpot(spot);
  }, []);

  const hideSpot = useCallback((spot: number) => {
    setHiddenSpots((prev) => {
      const next = new Set(prev);
      next.add(spot);
      return next;
    });
    setSelectedSpot(spot);
  }, []);

  const toggleHidden = useCallback(() => {
    if (hiddenSpots.has(selectedSpot)) restoreSpot(selectedSpot);
    else hideSpot(selectedSpot);
  }, [hiddenSpots, hideSpot, restoreSpot, selectedSpot]);

  const isSpotMoved = useCallback(
    (spot: number) => {
      const territory = territoryMap.territories[spot - 1];
      const pos = positions[spot];
      if (!territory || !pos) return false;
      const orig = territoryOriginalCenter(territory);
      return Math.abs(pos.x - orig.x) > 0.05 || Math.abs(pos.y - orig.y) > 0.05;
    },
    [positions, territoryMap.territories]
  );

  const resetSpotPosition = useCallback(
    (spot: number) => {
      const territory = territoryMap.territories[spot - 1];
      if (!territory) return;
      const orig = territoryOriginalCenter(territory);
      setPositions((prev) => ({
        ...prev,
        [spot]: { x: orig.x, y: orig.y },
      }));
      setSelectedSpot(spot);
    },
    [territoryMap.territories]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      e.preventDefault();
      toggleHidden();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleHidden]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Карта</span>
          <select
            className={styles.select}
            value={mapId}
            onChange={(e) => onMapIdChange(e.target.value)}
          >
            {MAP_CATALOG.map((entry) => (
              <option key={entry.id} value={entry.id}>
                №{entry.number} — {entry.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={persistLayout}
        >
          Сохранить
        </button>
        {import.meta.env.DEV ? (
          <button
            type="button"
            className={styles.btn}
            onClick={() => void writeToCode()}
          >
            Записать в код
          </button>
        ) : null}
        <button
          type="button"
          className={styles.btnDanger}
          onClick={toggleHidden}
        >
          {isHidden ? "Показать точку" : "Скрыть точку"}
        </button>
        <a className={styles.linkBtn} href={gameHref(mapId)}>
          ← К игре
        </a>
      </div>

      {saveMsg ? <p className={styles.saveHint}>{saveMsg}</p> : null}
      {errorMsg ? <p className={styles.errorHint}>{errorMsg}</p> : null}

      <p className={styles.fieldLabel}>
        Редактор точек
        {catalog ? ` — №${catalog.number} (${catalog.name})` : ""}. Клик по
        стране — выбор точки. Перетащите кружок. Delete — скрыть/показать.
      </p>

      <div className={styles.layout}>
        <div className={styles.mapColumn}>
          <div
            className={styles.wrap}
            style={{
              aspectRatio: mapAspectRatio(territoryMap),
              ["--map-ar" as string]: String(
                territoryMap.viewBox.width / territoryMap.viewBox.height
              ),
            }}
          >
            <svg
              ref={svgRef}
              className={styles.svg}
              viewBox={mapViewBoxString(territoryMap)}
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`Редактор точек: ${territoryMap.name}`}
              onPointerMove={(e) => {
                if (draggingSpot === null || !svgRef.current) return;
                const pt = clientPointToMapSpace(
                  svgRef.current,
                  e.clientX,
                  e.clientY
                );
                if (!pt) return;
                setPositions((prev) => ({
                  ...prev,
                  [draggingSpot]: {
                    x: Math.round(pt.x * 10) / 10,
                    y: Math.round(pt.y * 10) / 10,
                  },
                }));
              }}
              onPointerUp={() => setDraggingSpot(null)}
              onPointerCancel={() => setDraggingSpot(null)}
            >
              <TerritoryClipDefs
                prefix={`editor-${mapId}`}
                territories={territoryMap.territories}
              />
              {territoryMap.territories.map((territory, index) => {
                const spot = index + 1;
                const hidden = hiddenSpots.has(spot);
                const pos = positions[spot] ?? {
                  x: territory.dotX,
                  y: territory.dotY,
                };
                return (
                  <g
                    key={territory.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedSpot(spot)}
                  >
                    <TerritoryPaths
                      paths={territory.paths}
                      clipPathId={
                        territory.clip
                          ? `editor-${mapId}-${territory.id}`
                          : undefined
                      }
                      className={
                        hidden
                          ? styles.territoryAreaHidden
                          : styles.territoryArea
                      }
                    />
                    {!hidden || showHiddenOnMap ? (
                      <g
                        data-editor-dot
                        data-spot={spot}
                        className={hidden ? styles.dotGhost : undefined}
                      >
                        <UnitDot
                          cx={pos.x}
                          cy={pos.y}
                          r={spotMetrics.dotRadius}
                          variant="editor"
                          selected={selectedSpot === spot}
                          interactive={!hidden}
                        />
                        <text
                          className={mapStyles.territoryLabel}
                          x={pos.x}
                          y={pos.y + spotMetrics.labelOffsetY}
                          textAnchor="middle"
                          fontSize={spotMetrics.labelFont}
                          pointerEvents="none"
                          opacity={hidden ? 0.5 : 1}
                        >
                          {spot}
                        </text>
                        {!hidden ? (
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={spotMetrics.spotRingRadius + 1}
                            fill="transparent"
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedSpot(spot);
                              setDraggingSpot(spot);
                              svgRef.current?.setPointerCapture(e.pointerId);
                            }}
                          />
                        ) : null}
                      </g>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <aside className={styles.sidebar}>
          {selectedTerritory ? (
            <section className={`${styles.panel} ${styles.spotPanel}`}>
              <h2 className={styles.panelTitle}>Выбранная точка</h2>
              <dl>
                <dt>Номер</dt>
                <dd>
                  {selectedSpot}
                  {isHidden ? (
                    <span className={styles.hiddenBadge}> — скрыта в игре</span>
                  ) : null}
                </dd>
                <dt>Страна</dt>
                <dd>{selectedTerritory.name}</dd>
                <dt>Координаты</dt>
                <dd>
                  {selectedPos
                    ? `${selectedPos.x}, ${selectedPos.y}`
                    : `${selectedTerritory.dotX}, ${selectedTerritory.dotY}`}
                </dd>
              </dl>
              <div className={styles.spotActions}>
                {isSpotMoved(selectedSpot) ? (
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => resetSpotPosition(selectedSpot)}
                  >
                    Сбросить
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={toggleHidden}
                >
                  {isHidden ? "Показать в игре" : "Скрыть в игре"}
                </button>
              </div>
            </section>
          ) : (
            <section className={styles.panel}>
              <p className={styles.noSelection}>
                Точка не выбрана. Нажмите страну на карте или пункт в списке
                «Все точки».
              </p>
            </section>
          )}

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Все точки</h2>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={showHiddenOnMap}
                onChange={(e) => setShowHiddenOnMap(e.target.checked)}
              />
              Показывать скрытые на карте
            </label>
            <ul className={styles.spotList}>
              {territoryMap.territories.map((territory, index) => {
                const spot = index + 1;
                const hidden = hiddenSpots.has(spot);
                const selected = selectedSpot === spot;
                return (
                  <li
                    key={spot}
                    className={`${styles.spotListItem}${
                      selected ? ` ${styles.spotListItemSelected}` : ""
                    }${hidden ? ` ${styles.spotListItemHidden}` : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.spotListSelect}
                      onClick={() => setSelectedSpot(spot)}
                    >
                      №{spot} — {territory.name}
                    </button>
                    {hidden ? (
                      <button
                        type="button"
                        className={styles.hiddenItemBtn}
                        onClick={() => restoreSpot(spot)}
                      >
                        Вернуть
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.hiddenItemBtn}
                        onClick={() => hideSpot(spot)}
                      >
                        Скрыть
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
