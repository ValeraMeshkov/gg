/**
 * Внешний вид оффлайн-ботов (домашний экран), по порядку слотов 2–6.
 */
import type { BuildingSkinId, FighterSkinId } from "./skinIds.js";
import type { DisplayColorId } from "./displayColors.js";

export type OfflineMockBotAppearance = {
  readonly fighter: FighterSkinId;
  readonly building: BuildingSkinId;
  readonly displayColor: DisplayColorId;
};

/** Индекс 0 — первый бот … 4 — пятый. */
export const OFFLINE_MOCK_BOT_APPEARANCES = [
  {
    fighter: "bomb",
    building: "skull",
    displayColor: "red",
  },
  {
    fighter: "shield",
    building: "flower",
    displayColor: "green",
  },
  {
    fighter: "star",
    building: "crown",
    displayColor: "orange",
  },
  {
    fighter: "rocket",
    building: "castle",
    displayColor: "violet",
  },
  {
    fighter: "bear",
    building: "temple",
    displayColor: "gold",
  },
] as const satisfies readonly OfflineMockBotAppearance[];
