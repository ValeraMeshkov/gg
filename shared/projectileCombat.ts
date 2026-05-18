/** Сила патрона в полёте: и «жизни», и урон по клетке при приземлении. */
export type ProjectileCombatStats = {
  power: number;
};

/** Сила исчерпана — снаряд должен быть снят с карты. */
export function isProjectileSpent(power: number): boolean {
  return power <= 0;
}

export type MutualCollisionResult = {
  aDestroyed: boolean;
  bDestroyed: boolean;
};

/**
 * Взаимное столкновение: с обоих снимается min(силаA, силаB).
 * Пуля (1) vs бомба (3) → пуля 0, бомба 2; бомба (3) vs бомба (2) → слабая 0, сильная 1.
 */
export function applyMutualProjectileCollision(
  a: ProjectileCombatStats,
  b: ProjectileCombatStats
): MutualCollisionResult {
  const clash = Math.min(Math.max(0, a.power), Math.max(0, b.power));
  if (clash > 0) {
    a.power -= clash;
    b.power -= clash;
  }
  return {
    aDestroyed: isProjectileSpent(a.power),
    bDestroyed: isProjectileSpent(b.power),
  };
}

/** @deprecated Используйте applyMutualProjectileCollision */
export const applyMutualProjectileDamage = applyMutualProjectileCollision;
