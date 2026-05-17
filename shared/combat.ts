/** Минимальные поля клетки для расчёта попадания снаряда. */
export type CombatCell = {
  ownerId?: string;
  units?: number;
};

/**
 * Одно попадание снаряда по клетке: −1 врагу/нейтрали, при пробитии — захват и остаток;
 * своя клетка — +1 без потолка (пассивный рост ограничен отдельно в `CELL.ownedCap`).
 */
export function applyIncrementalLandHit<T extends CombatCell>(
  cell: T,
  attackerId: string
): T {
  if (cell.ownerId === attackerId) {
    return { ...cell, units: (cell.units ?? 0) + 1 };
  }
  const u = (cell.units ?? 0) - 1;
  if (u < 0) {
    return { ...cell, ownerId: attackerId, units: -u };
  }
  return { ...cell, units: u };
}
