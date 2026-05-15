import type { BuildingSkinId, FighterSkinId } from "./skins.js";

export type PlayerAppearance = {
  fighter: FighterSkinId;
  building: BuildingSkinId;
};

export type PlayerAppearancesMap = Record<string, PlayerAppearance>;

export type UserPreferences = {
  lastMapId?: string;
  controlledPlayerId?: string;
};

export type UserProfile = {
  userId: string;
  appearances: PlayerAppearancesMap;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
};
