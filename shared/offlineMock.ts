/**
 * Внешний вид оффлайн-ботов (домашний экран), по порядку слотов 2–6.
 */
import {
  coerceBuildingSkinId,
  type BuildingSkinId,
  type FighterSkinId,
} from "./skinIds.js";
import type { DisplayColorId } from "./displayColors.js";

export type OfflineMockBotAppearance = {
  readonly fighter: FighterSkinId;
  readonly building: BuildingSkinId;
  readonly displayColor: DisplayColorId;
};

/** Разные 3D-здания на карте для каждого бота (индекс 0 — первый бот … 4 — пятый). */
const OFFLINE_BOT_BUILDINGS = [
  "pixellabs3822",
  "freedomCastle",
  "pixellabsUndead",
  "blendertimerHeart23",
  "pixellabsZombie",
] as const satisfies readonly BuildingSkinId[];

/** Индекс 0 — первый бот … 4 — пятый. */
export const OFFLINE_MOCK_BOT_APPEARANCES = [
  {
    fighter: "bomb",
    building: OFFLINE_BOT_BUILDINGS[0],
    displayColor: "red",
  },
  {
    fighter: "poison",
    building: OFFLINE_BOT_BUILDINGS[1],
    displayColor: "green",
  },
  {
    fighter: "potion",
    building: OFFLINE_BOT_BUILDINGS[2],
    displayColor: "orange",
  },
  {
    fighter: "dagger",
    building: OFFLINE_BOT_BUILDINGS[3],
    displayColor: "violet",
  },
  {
    fighter: "bomb",
    building: OFFLINE_BOT_BUILDINGS[4],
    displayColor: "gold",
  },
] as const satisfies readonly OfflineMockBotAppearance[];

/** Скин здания бота по индексу; при удалении из каталога — дефолтное здание. */
export function buildingSkinForOfflineBot(botIndex: number): BuildingSkinId {
  const skin = OFFLINE_BOT_BUILDINGS[botIndex % OFFLINE_BOT_BUILDINGS.length];
  return coerceBuildingSkinId(skin);
}
