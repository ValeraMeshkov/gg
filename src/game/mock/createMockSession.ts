import { isTerritoryIndexHidden } from "../maps/world/mapDotLayout";
import type { GameMap } from "../maps/types";
import { MOCK_PLAYERS } from "./user";

export type MockPlayerSlot = {
  user: (typeof MOCK_PLAYERS)[number];
  score: number;
};

export type MockGameSession = {
  map: GameMap;
  players: readonly MockPlayerSlot[];
};

function cloneMapWithCells(source: GameMap): GameMap {
  return {
    ...source,
    cells: source.cells.map((c) => ({ ...c })),
  };
}

function playableCellIndices(map: GameMap): number[] {
  const indices: number[] = [];
  for (let i = 0; i < map.cells.length; i++) {
    if (isTerritoryIndexHidden(map, i)) continue;
    indices.push(i);
  }
  return indices;
}

/** Три разных индекса из играбельных клеток (без скрытых точек). */
function pickThreeDistinctIndices(playable: readonly number[]): [number, number, number] {
  if (playable.length < 3) {
    throw new Error("Для трёх игроков на карте нужно минимум 3 играбельные клетки");
  }
  const picked = new Set<number>();
  while (picked.size < 3) {
    picked.add(playable[Math.floor(Math.random() * playable.length)]!);
  }
  const [a, b, c] = [...picked];
  return [a!, b!, c!];
}

/**
 * Старт партии: у каждого игрока initialScore очков, каждый захватывает свою случайную клетку.
 */
export function createMockSession(baseMap: GameMap): MockGameSession {
  const map = cloneMapWithCells(baseMap);
  const playable = playableCellIndices(map);
  const [idx1, idx2, idx3] = pickThreeDistinctIndices(playable);
  const indices = [idx1, idx2, idx3] as const;

  for (let i = 0; i < 3; i++) {
    const user = MOCK_PLAYERS[i]!;
    map.cells[indices[i]!] = {
      ...map.cells[indices[i]!],
      ownerId: user.id,
      units: user.initialScore,
    };
  }

  return {
    map,
    players: MOCK_PLAYERS.map((user) => ({
      user,
      score: user.initialScore,
    })),
  };
}
