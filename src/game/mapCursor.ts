import handPng from "@/assets/hand.png";

/** Сторона ассета (согласовано с TutorialHandGlyph). */
export const MAP_CURSOR_ART_SIZE = 140;

/** Кончик прицела в координатах PNG (см. TutorialHandGlyph). */
export const MAP_CURSOR_TIP_X = 28;
export const MAP_CURSOR_TIP_Y = -15;
export const MAP_CURSOR_NUDGE_X = 26;
export const MAP_CURSOR_NUDGE_Y = 32;

/** Отображаемый размер курсора в CSS (px). */
export const MAP_CURSOR_DISPLAY_PX = 32;

export function mapCursorHotspot(
  displayPx: number = MAP_CURSOR_DISPLAY_PX
): { x: number; y: number } {
  const ax = MAP_CURSOR_TIP_X + MAP_CURSOR_NUDGE_X;
  const ay = MAP_CURSOR_TIP_Y + MAP_CURSOR_NUDGE_Y;
  const scale = displayPx / MAP_CURSOR_ART_SIZE;
  return {
    x: Math.round(ax * scale),
    y: Math.round(ay * scale),
  };
}

export function mapCursorCss(
  fallback = "crosshair",
  displayPx: number = MAP_CURSOR_DISPLAY_PX
): string {
  const { x, y } = mapCursorHotspot(displayPx);
  return `url(${handPng}) ${x} ${y}, ${fallback}`;
}
