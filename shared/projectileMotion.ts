import { TERRITORY_PROJECTILE_R } from "./constants.js";

/** Геометрия полёта одной пули (координаты viewBox карты). */
export type ProjectilePath = {
  spawnTime: number;
  flightDuration: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  /** Пик поперечного смещения в середине пути (sin-дуга, 0 на вылете и прилёте). */
  arcPerpX: number;
  arcPerpY: number;
};

export function projectileHitRadius(): number {
  return TERRITORY_PROJECTILE_R * 2 * 0.92;
}

export function projectileHitRadius2(): number {
  const r = projectileHitRadius();
  return r * r;
}

/** sin(π·k): 0 в начале и в конце, максимум в середине. */
export function projectileArcBulgeFactor(k: number): number {
  return Math.sin(Math.PI * k);
}

/** Позиция на траектории при доле полёта k ∈ [0, 1]. */
export function projectilePositionAtProgress(
  path: ProjectilePath,
  k: number
): { x: number; y: number } {
  const bulge = projectileArcBulgeFactor(k);
  return {
    x:
      path.sx +
      (path.tx - path.sx) * k +
      path.arcPerpX * bulge,
    y:
      path.sy +
      (path.ty - path.sy) * k +
      path.arcPerpY * bulge,
  };
}

/** Касательная (не нормирована) для угла спрайта при доле полёта k. */
export function projectileTangentAtProgress(
  path: ProjectilePath,
  k: number
): { x: number; y: number } {
  const fd = path.flightDuration;
  if (fd <= 0) {
    return { x: path.tx - path.sx, y: path.ty - path.sy };
  }
  const bulgeDeriv = Math.PI * Math.cos(Math.PI * k);
  return {
    x: (path.tx - path.sx + path.arcPerpX * bulgeDeriv) / fd,
    y: (path.ty - path.sy + path.arcPerpY * bulgeDeriv) / fd,
  };
}

/** Позиция пули в момент now (Unix/perf ms); null — ещё не вылетела или уже прилетела. */
export function projectilePositionAt(
  path: ProjectilePath,
  now: number
): { x: number; y: number } | null {
  const t = now - path.spawnTime;
  if (t < 0) return null;
  const fd = path.flightDuration;
  if (fd <= 0) return { x: path.tx, y: path.ty };
  if (t >= fd) return null;
  const k = t / fd;
  return projectilePositionAtProgress(path, k);
}

function activeTimeWindow(
  path: ProjectilePath
): { start: number; end: number } | null {
  const start = path.spawnTime;
  const end = path.spawnTime + path.flightDuration;
  if (end <= start) return { start, end: start };
  return { start, end };
}

/**
 * Были ли пули ближе hitRadius хотя бы в один момент интервала [t0, t1].
 * Нужно для пересечения «наискось», когда в дискретные тики они далеко друг от друга.
 */
export function projectilesCollideDuringInterval(
  a: ProjectilePath,
  b: ProjectilePath,
  t0: number,
  t1: number
): boolean {
  if (t1 <= t0) return false;
  const wa = activeTimeWindow(a);
  const wb = activeTimeWindow(b);
  if (!wa || !wb) return false;
  const start = Math.max(wa.start, wb.start, t0);
  const end = Math.min(wa.end, wb.end, t1);
  if (end <= start) return false;

  const hitR2 = projectileHitRadius2();
  const samples = 12;
  for (let i = 0; i <= samples; i++) {
    const t = start + (i / samples) * (end - start);
    const pa = projectilePositionAt(a, t);
    const pb = projectilePositionAt(b, t);
    if (!pa || !pb) continue;
    const dx = pa.x - pb.x;
    const dy = pa.y - pb.y;
    if (dx * dx + dy * dy < hitR2) return true;
  }
  return false;
}
