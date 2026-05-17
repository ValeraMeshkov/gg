import { CELL } from "@/shared/constants";
import { pickDistinctIndices } from "@/shared/pickDistinct";
import { normalizeOfflineBotCount } from "@/shared/offlineBotCount";
import {
  normalizeOfflineBotDifficulty,
  offlineBotStartTerritoriesPerBot,
  offlineHumanStartTerritories,
} from "@/shared/offlineBotDifficulty";
import { isTerritoryIndexHidden } from "@/game/maps/world/mapDotLayout";
import type { GameMap } from "@/game/maps/types";
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

function scoreTotalsFromMap(map: GameMap): Map<string, number> {
  const totals = new Map<string, number>();
  for (const cell of map.cells) {
    const id = cell.ownerId;
    if (!id) continue;
    totals.set(id, (totals.get(id) ?? 0) + (cell.units ?? 0));
  }
  return totals;
}

/**
 * Старт партии: игрок + `botCount` ботов.
 * На высокой сложности: у игрока 2 точки с 100%; у ботов 2 с 80%, 3 с 100%.
 */
export function createMockSession(
  baseMap: GameMap,
  botCount = 2,
  difficulty?: number
): MockGameSession {
  const bots = normalizeOfflineBotCount(botCount);
  const d = normalizeOfflineBotDifficulty(difficulty);
  const requestedPerHuman = offlineHumanStartTerritories(d);
  const requestedPerBot = offlineBotStartTerritoriesPerBot(d);
  const map = cloneMapWithCells(baseMap);
  const playable = playableCellIndices(map);
  const maxPerBot = Math.max(
    1,
    Math.floor((playable.length - requestedPerHuman) / bots)
  );
  const perBot = Math.min(requestedPerBot, maxPerBot);
  const maxPerHuman = Math.max(1, playable.length - bots * perBot);
  const perHuman = Math.min(requestedPerHuman, maxPerHuman);
  const totalStarts = perHuman + bots * perBot;
  const indices = pickDistinctIndices(playable, totalStarts);

  const human = MOCK_PLAYERS[0]!;
  for (let t = 0; t < perHuman; t++) {
    map.cells[indices[t]!] = {
      ...map.cells[indices[t]!],
      ownerId: human.id,
      units: CELL.playerStart,
    };
  }

  let cursor = perHuman;
  for (let b = 0; b < bots; b++) {
    const user = MOCK_PLAYERS[b + 1]!;
    for (let t = 0; t < perBot; t++) {
      map.cells[indices[cursor]!] = {
        ...map.cells[indices[cursor]!],
        ownerId: user.id,
        units: CELL.playerStart,
      };
      cursor += 1;
    }
  }

  const totals = scoreTotalsFromMap(map);
  const playerCount = 1 + bots;

  return {
    map,
    players: MOCK_PLAYERS.slice(0, playerCount).map((user) => ({
      user,
      score: totals.get(user.id) ?? user.initialScore,
    })),
  };
}
