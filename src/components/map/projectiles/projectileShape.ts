/** Треугольник «носом» по направлению полёта (angle в радианах, 0 = вправо). */
export function projectileTrianglePoints(
  cx: number,
  cy: number,
  angle: number,
  size: number
): string {
  const tipLen = size * 1.15;
  const baseLen = size * 0.5;
  const halfW = size * 0.7;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = cx + cos * tipLen;
  const tipY = cy + sin * tipLen;
  const backX = cx - cos * baseLen;
  const backY = cy - sin * baseLen;
  const px = -sin;
  const py = cos;
  const lx = backX + px * halfW;
  const ly = backY + py * halfW;
  const rx = backX - px * halfW;
  const ry = backY - py * halfW;
  return `${tipX},${tipY} ${lx},${ly} ${rx},${ry}`;
}
