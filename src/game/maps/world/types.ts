import type { MapCell } from "../types";

/** Одна страна / регион на SVG-карте. */
export type TerritoryClipRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MapTerritory = {
  id: string;
  name: string;
  /** Один или несколько `<path d="…">` из world.svg. */
  paths: readonly string[];
  /** Обрезка общего контура (штат Австралии на одном path). */
  clip?: TerritoryClipRect;
  /** Центр кружка из world.svg (не меняется при правках в редакторе). */
  originalDotX: number;
  originalDotY: number;
  /** Рабочие координаты кружка в игре и редакторе. */
  dotX: number;
  dotY: number;
};

export type TerritoryMapViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Карта-континент: завоёвываемые области с кружками. */
export type TerritoryGameMap = {
  kind: "territory";
  id: string;
  name: string;
  continentId: string;
  viewBox: TerritoryMapViewBox;
  territories: readonly MapTerritory[];
  /** Номера точек (1…N), скрытые в игре. */
  hiddenSpots: readonly number[];
  /** Состояние клеток: индекс = порядок в `territories`. */
  cells: MapCell[];
};

export type GameMap = TerritoryGameMap;

export function isTerritoryMap(map: GameMap): map is TerritoryGameMap {
  return map.kind === "territory";
}
