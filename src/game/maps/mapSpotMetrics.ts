import { computeSvgMeetTransform } from "@/components/map";
import {
  NEUTRAL_SPOT_DOT_RADIUS,
  TERRITORY_DOT_HIT_PADDING,
  TERRITORY_DOT_RADIUS,
  TERRITORY_DOT_RING_PADDING,
  TERRITORY_LABEL_FONT,
  TERRITORY_LABEL_OFFSET_Y,
  TERRITORY_SPOT_RING_RADIUS,
} from "@/game/mapLayout";
import type { GameMap } from "./world/types";

/**
 * Эталонный размер цветного кольца на экране (px), подобран под Азию при ~900px ширины.
 * Кольцо = TERRITORY_DOT_RADIUS + TERRITORY_DOT_RING_PADDING в viewBox × типичный meet-scale.
 */
const REFERENCE_MEET_SCALE = 900 / 753.6;
export const MAP_SPOT_RING_RADIUS_PX =
  TERRITORY_SPOT_RING_RADIUS * REFERENCE_MEET_SCALE;
export const MAP_NEUTRAL_DOT_RADIUS_PX =
  NEUTRAL_SPOT_DOT_RADIUS * REFERENCE_MEET_SCALE;
export const MAP_DOT_HIT_PADDING_PX =
  TERRITORY_DOT_HIT_PADDING * REFERENCE_MEET_SCALE;
export const MAP_LABEL_FONT_PX = TERRITORY_LABEL_FONT * REFERENCE_MEET_SCALE;
export const MAP_LABEL_OFFSET_Y_PX =
  TERRITORY_LABEL_OFFSET_Y * REFERENCE_MEET_SCALE;

export type MapSpotMetrics = {
  meetScale: number;
  dotRadius: number;
  neutralDotRadius: number;
  spotRingRadius: number;
  hitRadius: number;
  labelFont: number;
  labelOffsetY: number;
};

/** ViewBox-радиусы точек с постоянным размером на экране (как 3D-пины). */
export function computeMapSpotMetrics(
  map: GameMap,
  clientWidth: number,
  clientHeight: number
): MapSpotMetrics {
  const w = Math.max(1, clientWidth);
  const h = Math.max(1, clientHeight);
  const { scale: meetScale } = computeSvgMeetTransform(w, h, map.viewBox);
  const toViewBox = (px: number) => px / meetScale;

  const ringPaddingPx = TERRITORY_DOT_RING_PADDING * REFERENCE_MEET_SCALE;
  const spotRingRadius = toViewBox(MAP_SPOT_RING_RADIUS_PX);
  const dotRadius = toViewBox(MAP_SPOT_RING_RADIUS_PX - ringPaddingPx);
  const neutralDotRadius = toViewBox(MAP_NEUTRAL_DOT_RADIUS_PX);
  const hitRadius = dotRadius + toViewBox(MAP_DOT_HIT_PADDING_PX);

  return {
    meetScale,
    dotRadius,
    neutralDotRadius,
    spotRingRadius,
    hitRadius,
    labelFont: toViewBox(MAP_LABEL_FONT_PX),
    labelOffsetY: toViewBox(MAP_LABEL_OFFSET_Y_PX),
  };
}

/** Fallback до измерения SVG (только по ширине viewBox). */
export function computeMapSpotMetricsFallback(map: GameMap): MapSpotMetrics {
  const vbScale = map.viewBox.width / 753.6;
  const dotRadius = TERRITORY_DOT_RADIUS * vbScale;
  const spotRingRadius = TERRITORY_SPOT_RING_RADIUS * vbScale;
  return {
    meetScale: 1,
    dotRadius,
    neutralDotRadius: NEUTRAL_SPOT_DOT_RADIUS * vbScale,
    spotRingRadius,
    hitRadius: dotRadius + TERRITORY_DOT_HIT_PADDING * vbScale,
    labelFont: TERRITORY_LABEL_FONT * vbScale,
    labelOffsetY: TERRITORY_LABEL_OFFSET_Y * vbScale,
  };
}
