/** Публичный API карты (импорт из `./map` или `./map/...`). */

export { computeSvgMeetTransform } from "./utils/viewBoxMeetTransform";
export { clientPointToMapSpace } from "./utils/svgCoords";

export { TerritoryPaths } from "./territory/TerritoryPaths";
export { TerritoryClipDefs } from "./territory/TerritoryClipDefs";

export {
  MapSpotMetricsProvider,
  useMapSpotMetrics,
} from "./spots/MapSpotMetricsContext";
export { UnitDot, type UnitDotVariant } from "./spots/UnitDot";
export { BuildingMarker } from "./spots/BuildingMarker";
export { FighterShape } from "./spots/FighterShape";
export {
  TerritorySpotBuilding,
  TerritorySpotInteractive,
  TerritorySpotStatic,
  type DragState,
} from "./spots/TerritoryMapSpotLayers";

export {
  MapProjectilesCanvas,
  type MapProjectilesCanvasHandle,
} from "./projectiles/MapProjectilesCanvas";
export type { MapProjectileDraw } from "./projectiles/mapProjectileTypes";
export { LandHitFxLayer } from "./projectiles/LandHitFxLayer";

export { AimArrowGroup, type AimSeg } from "./combat/AimArrowGroup";

export { FirstMoveHintLayer } from "./hints/FirstMoveHintLayer";
export { TutorialHandGlyph } from "./hints/TutorialHandGlyph";

export { SkinPreviewIcon } from "./glyphs/SkinPreviewIcon";

export * from "./buildingGlb";
