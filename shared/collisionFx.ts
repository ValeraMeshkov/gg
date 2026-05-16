import { seededRandom } from "./seededRandom.js";

/** Доля столкновений пуль, для которых показывается взрыв (остальные — только исчезновение). */
const COLLISION_EXPLOSION_FRACTION = 0.5;

function collisionPairKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

/**
 * Детерминированно по id двух пуль (как на клиенте: `proj-${attackId}-${index}`).
 * Одинаковый результат на всех клиентах и на сервере для одной пары.
 */
export function projectileCollisionShowsExplosion(
  projectileIdA: string,
  projectileIdB: string
): boolean {
  const key = collisionPairKey(projectileIdA, projectileIdB);
  return seededRandom(`proj-collide-explode:${key}`)() < COLLISION_EXPLOSION_FRACTION;
}
