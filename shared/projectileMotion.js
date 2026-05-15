import { TERRITORY_PROJECTILE_R } from "./constants.js";
export function projectileHitRadius() {
    return TERRITORY_PROJECTILE_R * 2 * 0.92;
}
export function projectileHitRadius2() {
    const r = projectileHitRadius();
    return r * r;
}
/** Позиция пули в момент now (Unix/perf ms); null — ещё не вылетела или уже прилетела. */
export function projectilePositionAt(path, now) {
    const t = now - path.spawnTime;
    if (t < 0)
        return null;
    const fd = path.flightDuration;
    if (fd <= 0)
        return { x: path.tx, y: path.ty };
    if (t >= fd)
        return null;
    const k = t / fd;
    return {
        x: path.sx + (path.tx - path.sx) * k,
        y: path.sy + (path.ty - path.sy) * k,
    };
}
function activeTimeWindow(path) {
    const start = path.spawnTime;
    const end = path.spawnTime + path.flightDuration;
    if (end <= start)
        return { start, end: start };
    return { start, end };
}
/**
 * Были ли пули ближе hitRadius хотя бы в один момент интервала [t0, t1].
 * Нужно для пересечения «наискось», когда в дискретные тики они далеко друг от друга.
 */
export function projectilesCollideDuringInterval(a, b, t0, t1) {
    if (t1 <= t0)
        return false;
    const wa = activeTimeWindow(a);
    const wb = activeTimeWindow(b);
    if (!wa || !wb)
        return false;
    const start = Math.max(wa.start, wb.start, t0);
    const end = Math.min(wa.end, wb.end, t1);
    if (end <= start)
        return false;
    const hitR2 = projectileHitRadius2();
    const samples = 12;
    for (let i = 0; i <= samples; i++) {
        const t = start + (i / samples) * (end - start);
        const pa = projectilePositionAt(a, t);
        const pb = projectilePositionAt(b, t);
        if (!pa || !pb)
            continue;
        const dx = pa.x - pb.x;
        const dy = pa.y - pb.y;
        if (dx * dx + dy * dy < hitR2)
            return true;
    }
    return false;
}
