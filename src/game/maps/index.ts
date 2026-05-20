export type { GameMap, MapCell, TerritoryGameMap } from './types'
export { assertMapShape, isTerritoryMap } from './types'
export {
  cellPosFromIndex,
  territoryCellPos,
  cellCount,
  cellIndex,
  getCell,
  getCellAt,
  mapDotCenter,
  isMapSpotHidden,
  isTerritoryIndexHidden,
  mapSizeLabel,
  mapViewBoxString,
  mapAspectRatio,
  mapAspectRatioValue,
  type CellPos,
} from './mapAccess'
export { cellUnderCursorTerritoryDot } from './territoryDotPick'
export {
  forEachVisibleOwnedTerritorySpot,
  type VisibleOwnedTerritorySpot,
} from './iterateTerritorySpots'
export {
  mapProjectileRadius,
  mapProjectileRadiusFromDotRadius,
  mapShotSpeedPerMs,
} from './mapScale'
export { TERRITORY_MAPS, WORLD_CONTINENTS, SOUTH_AMERICA } from './world'
export {
  MAP_CATALOG,
  getMapCatalogEntry,
  getMapIdByCatalogNumber,
  getTerritorySpotNumber,
  pickRandomCatalogMapId,
  type MapCatalogEntry,
} from './mapCatalog'
export { MAP_ID, DEFAULT_MAP_ID, type MapId } from './mapIds'
export { MAPS, getMap, requireMap, RANDOM_MAP_POOL } from './registry'
