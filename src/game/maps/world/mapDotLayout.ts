import type { MapTerritory, TerritoryGameMap } from "./types";

export const MAP_DOT_LAYOUT_STORAGE_PREFIX = "map-dot-layout";
export const MAP_DOT_LAYOUT_CHANGE_EVENT = "map-dot-layout-change";

export type DotPositionsBySpot = Record<number, { x: number; y: number }>;

export type MapDotLayoutV1 = {
  readonly version: 1;
  readonly positions: DotPositionsBySpot;
  readonly hiddenSpots: readonly number[];
  readonly savedAt?: string;
};

export type MapDotLayout = MapDotLayoutV1;

function storageKey(mapId: string): string {
  return `${MAP_DOT_LAYOUT_STORAGE_PREFIX}:${mapId}`;
}

function isPositionsRecord(value: unknown): value is DotPositionsBySpot {
  if (!value || typeof value !== "object") return false;
  return Object.values(value).every(
    (p) =>
      p &&
      typeof p === "object" &&
      typeof (p as { x?: unknown }).x === "number" &&
      typeof (p as { y?: unknown }).y === "number",
  );
}

function migrateLegacyRaw(raw: string): MapDotLayout | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isPositionsRecord(parsed)) return null;
    return {
      version: 1,
      positions: parsed,
      hiddenSpots: [],
      savedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function loadMapDotLayout(mapId: string): MapDotLayout | null {
  try {
    const raw = localStorage.getItem(storageKey(mapId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as MapDotLayoutV1).version === 1
    ) {
      const layout = parsed as MapDotLayoutV1;
      if (!isPositionsRecord(layout.positions)) return null;
      const hiddenSpots = Array.isArray(layout.hiddenSpots)
        ? layout.hiddenSpots.filter((n) => typeof n === "number")
        : [];
      return {
        version: 1,
        positions: layout.positions,
        hiddenSpots,
        savedAt: layout.savedAt,
      };
    }
    return migrateLegacyRaw(raw);
  } catch {
    return null;
  }
}

export function saveMapDotLayout(mapId: string, layout: MapDotLayout): void {
  const payload: MapDotLayoutV1 = {
    version: 1,
    positions: layout.positions,
    hiddenSpots: [...layout.hiddenSpots].sort((a, b) => a - b),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(storageKey(mapId), JSON.stringify(payload));
  window.dispatchEvent(
    new CustomEvent(MAP_DOT_LAYOUT_CHANGE_EVENT, { detail: { mapId } }),
  );
}

export function buildLayoutFromMap(map: TerritoryGameMap): MapDotLayout {
  const positions: DotPositionsBySpot = {};
  map.territories.forEach((t, index) => {
    const spot = index + 1;
    positions[spot] = { x: t.dotX, y: t.dotY };
  });
  return {
    version: 1,
    positions,
    hiddenSpots: [...map.hiddenSpots],
  };
}

export function getEffectiveLayout(map: TerritoryGameMap): MapDotLayout {
  const stored = loadMapDotLayout(map.id);
  if (stored) return stored;
  return buildLayoutFromMap(map);
}

export function getHiddenSpotsSet(mapId: string, map?: TerritoryGameMap): ReadonlySet<number> {
  const stored = loadMapDotLayout(mapId);
  if (stored) return new Set(stored.hiddenSpots);
  if (map) return new Set(map.hiddenSpots);
  return new Set();
}

export function isMapSpotHidden(mapId: string, spot: number, map?: TerritoryGameMap): boolean {
  return getHiddenSpotsSet(mapId, map).has(spot);
}

export function isTerritoryIndexHidden(map: TerritoryGameMap, index: number): boolean {
  return isMapSpotHidden(map.id, index + 1, map);
}

export function territoryOriginalCenter(t: MapTerritory): { x: number; y: number } {
  return { x: t.originalDotX, y: t.originalDotY };
}

export function layoutToTerritoryDots(
  map: TerritoryGameMap,
  layout: MapDotLayout,
): Record<string, { dotX: number; dotY: number }> {
  const out: Record<string, { dotX: number; dotY: number }> = {};
  map.territories.forEach((t, index) => {
    const spot = index + 1;
    const p = layout.positions[spot];
    out[t.id] = p
      ? { dotX: Math.round(p.x * 10) / 10, dotY: Math.round(p.y * 10) / 10 }
      : { dotX: t.dotX, dotY: t.dotY };
  });
  return out;
}
