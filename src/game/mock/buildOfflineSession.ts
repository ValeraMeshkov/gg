import type { BuildingSkinId } from "@/shared/skinIds";
import type { DisplayColorId } from "@/shared/displayColors";
import { requireMap } from "@/game/maps";
import { createMockSession, type MockGameSession } from "./createMockSession";
import { MOCK_PLAYERS } from "./user";

export function offlineSessionSeed(params: {
  mapId: string;
  botCount: number;
  botDifficulty: number;
  soloRestartNonce: number;
  building: BuildingSkinId;
}): string {
  const { mapId, botCount, botDifficulty, soloRestartNonce, building } = params;
  return `${mapId}:${botCount}:${botDifficulty}:${soloRestartNonce}:${building}`;
}

export function buildOfflineSession(
  mapId: string,
  botCount: number,
  botDifficulty: number,
  building: BuildingSkinId,
  seed: string,
  displayColor: DisplayColorId
): MockGameSession {
  return createMockSession(
    requireMap(mapId),
    botCount,
    botDifficulty,
    building,
    seed,
    displayColor
  );
}

/** Заглушка до подключения WS в комнате. */
export function buildRoomPlaceholderSession(mapId: string): MockGameSession {
  const map = requireMap(mapId);
  return {
    map: { ...map, cells: map.cells.map((c) => ({ ...c })) },
    players: MOCK_PLAYERS.map((user) => ({
      user,
      score: user.initialScore,
    })),
  };
}
