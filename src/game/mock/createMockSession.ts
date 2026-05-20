import { pickDistinctIndices } from "@/shared/pickDistinct";
import { normalizeOfflineBotCount } from "@/shared/offlineBotCount";
import {
  normalizeOfflineBotDifficulty,
  offlineBotStartTerritoriesPerBot,
  offlineHumanStartTerritories,
} from "@/shared/offlineBotDifficulty";
import { initFortressCellIfOwner } from "@/shared/fortressShield";
import {
  hasSkeletonSpawn,
  playerStartForBuilding,
} from "@/shared/buildingMechanics";
import { grantExtraStartTerritories } from "@/shared/extraStartTerritories";
import { spawnSecondSkeletonAtStart } from "@/shared/skeletonSpawn";
import {
  rollOfflineBotRoster,
  type OfflineBotRosterEntry,
} from "@/shared/offlineBotRoster";
import type { BuildingSkinId } from "@/shared/skinIds";
import type { DisplayColorId } from "@/shared/displayColors";
import { isTerritoryIndexHidden } from "@/game/maps/world/mapDotLayout";
import type { GameMap } from "@/game/maps/types";
import { playerScoresFromCells } from "@/game/scoring/playerScores";
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

export function playableCellIndices(map: GameMap): number[] {
  const indices: number[] = [];
  for (let i = 0; i < map.cells.length; i++) {
    if (isTerritoryIndexHidden(map, i)) continue;
    indices.push(i);
  }
  return indices;
}

/**
 * Старт партии: игрок + `botCount` ботов.
 * На высокой сложности: у игрока 2 точки с 100%; у ботов 2 с 80%, 3 с 100%.
 */
export function createMockSession(
  baseMap: GameMap,
  botCount = 2,
  difficulty?: number,
  humanBuilding?: BuildingSkinId,
  offlineSessionSeed?: string,
  localDisplayColor: DisplayColorId = "blue"
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

  const botIds = MOCK_PLAYERS.slice(1, 1 + bots).map((u) => u.id);
  const botRoster: Record<string, OfflineBotRosterEntry> =
    offlineSessionSeed != null
      ? rollOfflineBotRoster(
          offlineSessionSeed,
          botIds,
          localDisplayColor
        )
      : {};

  const human = MOCK_PLAYERS[0]!;
  for (let t = 0; t < perHuman; t++) {
    map.cells[indices[t]!] = initFortressCellIfOwner(
      {
        ...map.cells[indices[t]!],
        ownerId: human.id,
        units: playerStartForBuilding(humanBuilding),
      },
      humanBuilding
    );
  }

  if (hasSkeletonSpawn(humanBuilding)) {
    const withSecond = spawnSecondSkeletonAtStart(
      map.cells,
      playable,
      human.id,
      humanBuilding
    );
    if (withSecond) map.cells = withSecond;
  }

  const extraHuman = grantExtraStartTerritories(
    map.cells,
    playable,
    human.id,
    humanBuilding
  );
  if (extraHuman) {
    map.cells = extraHuman.map((cell) =>
      initFortressCellIfOwner(cell, humanBuilding)
    );
  }

  let cursor = perHuman;
  for (let b = 0; b < bots; b++) {
    const user = MOCK_PLAYERS[b + 1]!;
    const botBuilding =
      botRoster[user.id]?.building ??
      ("pixellabs3822" satisfies BuildingSkinId);
    for (let t = 0; t < perBot; t++) {
      map.cells[indices[cursor]!] = initFortressCellIfOwner(
        {
          ...map.cells[indices[cursor]!],
          ownerId: user.id,
          units: playerStartForBuilding(botBuilding),
        },
        botBuilding
      );
      cursor += 1;
    }
    const extraBot = grantExtraStartTerritories(
      map.cells,
      playable,
      user.id,
      botBuilding
    );
    if (extraBot) {
      map.cells = extraBot.map((cell) =>
        initFortressCellIfOwner(cell, botBuilding)
      );
    }
  }

  const totals = playerScoresFromCells(map.cells);
  const playerCount = 1 + bots;

  return {
    map,
    players: MOCK_PLAYERS.slice(0, playerCount).map((user) => ({
      user,
      score: totals.get(user.id) ?? user.initialScore,
    })),
  };
}
