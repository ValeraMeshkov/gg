import type { BuildingSkinId, FighterSkinId } from "./skins.js";

export type UserProfile = {
  userId: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  createdAt: string;
  updatedAt: string;
};
