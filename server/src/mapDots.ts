import centers from "../../shared/mapDotCenters.json" with { type: "json" };

const DOT_CENTERS = centers as Record<string, readonly { x: number; y: number }[]>;

export function dotCenter(
  mapId: string,
  index: number
): { x: number; y: number } | null {
  const arr = DOT_CENTERS[mapId];
  if (!arr || index < 0 || index >= arr.length) return null;
  return arr[index] ?? null;
}
