import type { BuildingSkinId } from "./skinIds.js";
import { readCellUnits } from "./cellUnits.js";
import type { CombatCell } from "./landHit.js";

/** Сеть «линий жизни» — выравнивание HP между своими точками. */
export const HEART_LIFE = {
  /** Как часто пересчитывать пул (каждый тик — сразу к целевому делению). */
  balanceIntervalMs: 50,
  /** Не трогать пул, если max−min ≤ этого (18 и 19 — стоп). */
  balanceSpreadTolerance: 1,
} as const;

export function isHeartBuilding(skin: BuildingSkinId | undefined): boolean {
  return skin === "blendertimerHeart23";
}

export type HeartLifeNode = {
  index: number;
  x: number;
  y: number;
  units: number;
  ownerId: string;
};

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * Одна цепочка через все точки (ближайший сосед).
 * Порядок зависит только от позиций/индексов — не дёргается при смене HP.
 */
export function orderHeartLifeChain(
  nodes: readonly HeartLifeNode[]
): readonly HeartLifeNode[] {
  if (nodes.length < 2) return nodes;
  const byIndex = new Map(nodes.map((n) => [n.index, n]));
  const remaining = new Set(nodes.map((n) => n.index));
  const start = [...nodes].sort((a, b) => a.index - b.index)[0]!;
  const chain: HeartLifeNode[] = [start];
  remaining.delete(start.index);

  while (remaining.size > 0) {
    const cur = chain[chain.length - 1]!;
    let nearest: HeartLifeNode | null = null;
    let bestD2 = Infinity;
    for (const idx of remaining) {
      const n = byIndex.get(idx)!;
      const d2 = dist2(cur.x, cur.y, n.x, n.y);
      if (d2 < bestD2) {
        bestD2 = d2;
        nearest = n;
      }
    }
    if (!nearest) break;
    chain.push(nearest);
    remaining.delete(nearest.index);
  }
  return chain;
}

/** SVG path одной линии через всю цепочку. */
export function buildHeartLifeChainPathD(nodes: readonly HeartLifeNode[]): string {
  const chain = orderHeartLifeChain(nodes);
  if (chain.length < 2) return "";
  let d = `M${chain[0]!.x} ${chain[0]!.y}`;
  for (let i = 1; i < chain.length; i++) {
    d += ` L${chain[i]!.x} ${chain[i]!.y}`;
  }
  return d;
}

export function collectHeartLifeNodes(
  cells: readonly CombatCell[],
  playable: readonly number[],
  ownerId: string,
  cellCenter: (index: number) => { x: number; y: number } | null
): HeartLifeNode[] {
  const nodes: HeartLifeNode[] = [];
  for (const index of playable) {
    const cell = cells[index];
    if (cell?.ownerId !== ownerId) continue;
    const center = cellCenter(index);
    if (!center) continue;
    nodes.push({
      index,
      x: center.x,
      y: center.y,
      units: readCellUnits(cell),
      ownerId,
    });
  }
  return nodes;
}

/** Честное деление пула: 30+1→16+15, 16+15+1→11+11+10. */
function fairUnitTargets(
  indices: readonly number[],
  readUnits: (index: number) => number
): Map<number, number> {
  const total = indices.reduce((sum, i) => sum + readUnits(i), 0);
  const base = Math.floor(total / indices.length);
  let remainder = total % indices.length;
  const sorted = [...indices].sort((a, b) => a - b);
  const targets = new Map<number, number>();
  for (const i of sorted) {
    targets.set(i, base + (remainder > 0 ? 1 : 0));
    if (remainder > 0) remainder -= 1;
  }
  return targets;
}

/** Сразу выравнивает пул по цепочке (один пересчёт за тик). */
export function tickHeartLifeBalance<T extends CombatCell>(
  cells: readonly T[],
  ownerId: string,
  playable: readonly number[]
): T[] | null {
  const indices: number[] = [];
  for (const i of playable) {
    if (cells[i]?.ownerId === ownerId) indices.push(i);
  }
  if (indices.length < 2) return null;

  const read = (i: number) => readCellUnits(cells[i]);

  let minU = read(indices[0]!);
  let maxU = minU;
  for (const i of indices) {
    const u = read(i);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
  }
  if (maxU - minU <= HEART_LIFE.balanceSpreadTolerance) return null;

  const targets = fairUnitTargets(indices, read);
  const next = cells.slice() as T[];
  let changed = false;

  for (const i of indices) {
    const target = targets.get(i)!;
    const cur = read(i);
    if (cur === target) continue;
    next[i] = { ...next[i]!, units: target };
    changed = true;
  }

  return changed ? next : null;
}

export function tickHeartLifeBalanceForOwners<T extends CombatCell>(
  cells: readonly T[],
  playable: readonly number[],
  ownerIds: readonly string[],
  buildingForOwner: (ownerId: string) => BuildingSkinId | undefined
): T[] | null {
  let current = cells;
  let changed = false;
  for (const ownerId of ownerIds) {
    if (!isHeartBuilding(buildingForOwner(ownerId))) continue;
    const next = tickHeartLifeBalance(current, ownerId, playable);
    if (!next) continue;
    current = next;
    changed = true;
  }
  return changed ? [...current] : null;
}
