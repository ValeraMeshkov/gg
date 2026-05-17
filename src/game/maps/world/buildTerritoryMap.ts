import { CELL } from "@/game/constants";
import type { MapTerritory, TerritoryGameMap, TerritoryMapViewBox } from "./types";

export type TerritoryMapData = {
  continentId: string;
  name: string;
  viewBox: TerritoryMapViewBox;
  territories: readonly MapTerritory[];
  /** Номера точек (1…N), скрытые в игре. */
  hiddenSpots?: readonly number[];
};

/** Шаблон карты-континента: нейтральные клетки, владение задаёт createMockSession. */
export function buildTerritoryMap(data: TerritoryMapData): TerritoryGameMap {
  return {
    kind: "territory",
    id: data.continentId,
    name: data.name,
    continentId: data.continentId,
    viewBox: data.viewBox,
    territories: data.territories,
    hiddenSpots: data.hiddenSpots ?? [],
    cells: data.territories.map(() => ({
      units: CELL.neutralStart,
    })),
  };
}

export function assertTerritoryMapShape(map: TerritoryGameMap): void {
  if (map.cells.length !== map.territories.length) {
    throw new Error(
      `Карта "${map.id}": ожидалось ${map.territories.length} клеток, получено ${map.cells.length}`
    );
  }
}
