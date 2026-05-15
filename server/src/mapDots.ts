/** Центры точек (viewBox) для расчёта длительности полёта на сервере. */
const DOT_CENTERS: Record<string, readonly { x: number; y: number }[]> = {
  "south-america": [
    { x: 648.7, y: 790.4 },
    { x: 629.7, y: 606.6 },
    { x: 679, y: 593.4 },
    { x: 605.1, y: 760.9 },
    { x: 572.9, y: 475.7 },
    { x: 543.6, y: 513.4 },
    { x: 695.4, y: 832 },
    { x: 685.5, y: 476.8 },
    { x: 652.3, y: 470.9 },
    { x: 562.7, y: 560.9 },
    { x: 662.6, y: 652.3 },
    { x: 669.3, y: 476.6 },
    { x: 685.9, y: 710.7 },
    { x: 610.5, y: 460.5 },
  ],
};

export function dotCenter(
  mapId: string,
  index: number
): { x: number; y: number } | null {
  const arr = DOT_CENTERS[mapId];
  if (!arr || index < 0 || index >= arr.length) return null;
  return arr[index] ?? null;
}
