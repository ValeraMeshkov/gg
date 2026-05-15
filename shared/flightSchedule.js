import { MAP_SHOT_SPEED_PER_MS, TERRITORY_PROJECTILE_R, SHOT, } from "./constants.js";
function flightMsForDistance(dist) {
    if (dist <= 0)
        return 0;
    return dist / MAP_SHOT_SPEED_PER_MS;
}
/** План полёта пуль (без координат карты — только тайминги). */
export function buildFlightPlan(amount, sx, sy, tx, ty, baseTime, idPrefix) {
    const dx = tx - sx;
    const dy = ty - sy;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const ballD = TERRITORY_PROJECTILE_R * 2;
    const lateralStep = ballD * SHOT.neighborCenterDistBallDiameters;
    const ux = dx / len;
    const uy = dy / len;
    const wedgeStep = ballD * SHOT.wedgeAlongBallDiametersPerRank;
    const sims = Array.from({ length: amount }, (_, i) => {
        const releaseWave = Math.floor(i / SHOT.waveSize);
        const kInWave = i - releaseWave * SHOT.waveSize;
        const inWave = Math.min(SHOT.waveSize, amount - releaseWave * SHOT.waveSize);
        const half = (inWave - 1) / 2;
        const lateral = (kInWave - half) * lateralStep;
        const distFromCenter = Math.abs(kInWave - half);
        const wedgeRank = half - distFromCenter;
        const along0 = wedgeStep * wedgeRank;
        const offXL = px * lateral;
        const offYL = py * lateral;
        const sxSim = sx + ux * along0 + offXL;
        const sySim = sy + uy * along0 + offYL;
        const txSim = tx + offXL;
        const tySim = ty + offYL;
        const segLen = Math.hypot(txSim - sxSim, tySim - sySim) || 1;
        const flightDuration = flightMsForDistance(segLen);
        const spawnTime = baseTime + releaseWave * SHOT.bulletBatchGapMs;
        return {
            id: `proj-${idPrefix}-${i}`,
            releaseWave,
            spawnTime,
            flightDuration,
            spawnDelayMs: Math.max(0, spawnTime - baseTime),
            landDelayMs: Math.max(0, spawnTime + flightDuration - baseTime),
            sx: sxSim,
            sy: sySim,
            tx: txSim,
            ty: tySim,
        };
    });
    return { fromIndex: 0, toIndex: 0, amount, sims };
}
