export type { GameMap, MapCell, TerritoryGameMap } from './types'
export { assertMapShape, isTerritoryMap } from './types'
export {
  cellPosFromIndex,
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
export { cellUnderCursorTerritoryDot, territoryCellPos } from './territoryDotPick'
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
