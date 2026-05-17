/** Как у SVG `preserveAspectRatio="xMidYMid meet"`: масштаб и смещение viewBox → CSS-пиксели контейнера. */
export function computeSvgMeetTransform(
  clientWidth: number,
  clientHeight: number,
  viewBox: { x: number; y: number; width: number; height: number }
): { scale: number; tx: number; ty: number } {
  const scale = Math.min(
    clientWidth / viewBox.width,
    clientHeight / viewBox.height
  );
  const tx =
    (clientWidth - viewBox.width * scale) / 2 - viewBox.x * scale;
  const ty =
    (clientHeight - viewBox.height * scale) / 2 - viewBox.y * scale;
  return { scale, tx, ty };
}
