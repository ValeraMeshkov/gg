import { projectileRadiusFromDot, TERRITORY_DOT_RADIUS } from "../mapLayout";
import { SHOT } from "../constants";
import type { GameMap } from "./world/types";

/**
 * Координаты world.svg ~в 150× крупнее клетки сетки (1×1).
 * Без этого `flightDuration` для пули = десятки минут — кажется, что пули «стоят».
 */
const TERRITORY_SHOT_SPEED_FACTOR = 150;

/** Единиц viewBox за мс (чем больше — тем быстрее полёт). */
export function mapShotSpeedPerMs(_map: GameMap): number {
  return SHOT.speedPerMs * TERRITORY_SHOT_SPEED_FACTOR;
}

/** Радиус пули: диаметр кружка ÷ 3. */
export function mapProjectileRadius(_map: GameMap): number {
  return projectileRadiusFromDot(TERRITORY_DOT_RADIUS);
}

export function mapExplosionFlashGrow(map: GameMap): number {
  return mapProjectileRadius(map) * 3.5;
}

export function mapExplosionRingBase(map: GameMap): number {
  return mapProjectileRadius(map) * 2.8;
}

export function mapExplosionRingGrow(map: GameMap): number {
  return mapProjectileRadius(map) * 10;
}

export function mapTargetGlowRadius(_map: GameMap): number {
  return TERRITORY_DOT_RADIUS * 2;
}
