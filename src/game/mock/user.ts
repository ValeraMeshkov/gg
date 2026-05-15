import { CELL } from "../constants";

/** Мок-игрок для клиентского прототипа (позже заменится авторизацией / сервером). */
export const MOCK_USER = {
  id: "mock-user",
  displayName: "Игрок 1",
  /** Очки в начале партии (юниты на стартовой клетке). */
  initialScore: CELL.playerStart,
} as const;

export const MOCK_USER_2 = {
  id: "mock-user-2",
  displayName: "Игрок 2",
  initialScore: CELL.playerStart,
} as const;

export const MOCK_USER_3 = {
  id: "mock-user-3",
  displayName: "Игрок 3",
  initialScore: CELL.playerStart,
} as const;

/** Порядок совпадает с клавишами 1 / 2 / 3 в прототипе. */
export const MOCK_PLAYERS = [MOCK_USER, MOCK_USER_2, MOCK_USER_3] as const;
