import { normalizeOfflineBotCount } from "../../../shared/offlineBotCount.js";
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

/** N разных индексов из играбельных клеток (без скрытых точек). */
function pickDistinctIndices(
  playable: readonly number[],
  count: number
): number[] {
  if (playable.length < count) {
    throw new Error(
      `Для ${count} игроков на карте нужно минимум ${count} играбельных клеток`
    );
  }
  const picked = new Set<number>();
  while (picked.size < count) {
    picked.add(playable[Math.floor(Math.random() * playable.length)]!);
  }
  return [...picked];
}

/**
 * Старт партии: локальный игрок + `botCount` ботов (1–5), у каждого своя случайная клетка.
 */
export function createMockSession(
  baseMap: GameMap,
  botCount = 2
): MockGameSession {
  const bots = normalizeOfflineBotCount(botCount);
  const playerCount = 1 + bots;
  const map = cloneMapWithCells(baseMap);
  const playable = playableCellIndices(map);
  const indices = pickDistinctIndices(playable, playerCount);

  for (let i = 0; i < playerCount; i++) {
    const user = MOCK_PLAYERS[i]!;
    map.cells[indices[i]!] = {
      ...map.cells[indices[i]!],
      ownerId: user.id,
      units: user.initialScore,
    };
  }

  return {
    map,
    players: MOCK_PLAYERS.slice(0, playerCount).map((user) => ({
      user,
      score: user.initialScore,
    })),
  };
}
