import type { BuildingSkinId, FighterSkinId } from "./skins.js";

export type UserProfile = {
  userId: string;
  /** Показывается в интерфейсе и позже в чате; пусто → «Игрок N» по слоту. */
  displayName: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  createdAt: string;
  updatedAt: string;
};
