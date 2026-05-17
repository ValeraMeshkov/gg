import {
  africaData,
  asiaData,
  europeData,
  northAmericaData,
  oceaniaData,
  southAmericaData,
} from "./generated";
import {
  assertTerritoryMapShape,
  buildTerritoryMap,
} from "./buildTerritoryMap";
import type { TerritoryGameMap } from "./types";

function build(data: Parameters<typeof buildTerritoryMap>[0]): TerritoryGameMap {
  const map = buildTerritoryMap(data);
  assertTerritoryMapShape(map);
  return map;
}

/** Играбельные карты-континенты (попадают в случайный выбор при загрузке). */
export const TERRITORY_MAPS: readonly TerritoryGameMap[] = [
  build(southAmericaData),
  build(northAmericaData),
  build(europeData),
  build(africaData),
  build(asiaData),
  build(oceaniaData),
];

import { MAP_CATALOG } from "@/game/maps/mapCatalog";

/** Порядок id совпадает с номерами в `MAP_CATALOG`. */
export const RANDOM_MAP_POOL: readonly string[] = MAP_CATALOG.map((m) => m.id);
