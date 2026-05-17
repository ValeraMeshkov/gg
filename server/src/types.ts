import type { DisplayColorId } from "@/shared/displayColors.js";
import type { BuildingSkinId, FighterSkinId } from "./skins.js";

export type UserProfile = {
  userId: string;
  /** Показывается в интерфейсе и позже в чате; пусто → «Игрок N» по слоту. */
  displayName: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor?: DisplayColorId;
  offlineBotCount?: number;
  offlineBotDifficulty?: number;
  randomMapOnStart?: boolean;
  email?: string;
  googleLinked?: boolean;
  createdAt: string;
  updatedAt: string;
};
