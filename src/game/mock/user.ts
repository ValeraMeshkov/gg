import { CELL } from "@/game/constants";
import { PLAYER_SLOT_IDS } from "@/shared/playerSlots";

/** Мок-игроки для слотов карты (до 10 в комнате). */
export const MOCK_PLAYERS = PLAYER_SLOT_IDS.map((id, i) => ({
  id,
  displayName:
    i === 1
      ? "Сапёр"
      : i === 2
        ? "Щит"
        : `Игрок ${i + 1}`,
  initialScore: CELL.playerStart,
})) as readonly {
  id: string;
  displayName: string;
  initialScore: number;
}[];

export const MOCK_USER = MOCK_PLAYERS[0]!;
