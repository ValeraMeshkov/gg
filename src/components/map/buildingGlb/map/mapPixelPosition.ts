import { computeSvgMeetTransform } from "@/components/map/utils/viewBoxMeetTransform";

/** Точка карты (viewBox) → пиксели оверлея; Y снизу вверх (Three.js). */
export function mapPointToOverlayPixel(
  cx: number,
  cy: number,
  width: number,
  height: number,
  viewBox: { x: number; y: number; width: number; height: number }
): { px: number; py: number; scale: number } {
  const { scale, tx, ty } = computeSvgMeetTransform(width, height, viewBox);
  const px = cx * scale + tx;
  const fromTop = cy * scale + ty;
  return { px, py: height - fromTop, scale };
}
