import { CELL } from "../constants";
import { PLAYER_SLOT_IDS } from "../../../shared/playerSlots";

/** Мок-игроки для слотов карты (до 10 в комнате). */
export const MOCK_PLAYERS = PLAYER_SLOT_IDS.map((id, i) => ({
  id,
  displayName: `Игрок ${i + 1}`,
  initialScore: CELL.playerStart,
})) as readonly {
  id: string;
  displayName: string;
  initialScore: number;
}[];

export const MOCK_USER = MOCK_PLAYERS[0]!;
export const MOCK_USER_2 = MOCK_PLAYERS[1]!;
export const MOCK_USER_3 = MOCK_PLAYERS[2]!;
