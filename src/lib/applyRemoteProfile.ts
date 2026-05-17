import type { RemoteUserProfile } from "@/api/profileApi";
import {
  loadMyAppearance,
  saveMyAppearance,
} from "@/game/appearance/myAppearance";
import { DEFAULT_PLAYER_APPEARANCE } from "@/game/appearance/types";
import { saveMyDisplayName } from "@/game/myDisplayName";
import { writeOfflineBotCount } from "./offlineBotCountStorage";
import { writeOfflineBotDifficulty } from "./offlineBotDifficultyStorage";
import { writeRandomMapOnStart } from "./randomMapOnStart";
import { setUserId } from "./userId";

/** Применить профиль с сервера к localStorage (мгновенный UI до/после сети). */
export function applyRemoteProfileToLocal(profile: RemoteUserProfile): void {
  setUserId(profile.userId);

  const remoteName = (profile.displayName ?? "").trim().slice(0, 32);
  saveMyDisplayName(remoteName);

  const prev = loadMyAppearance();
  saveMyAppearance({
    fighter: profile.fighter,
    building: profile.building,
    displayColor:
      profile.displayColor ??
      prev.displayColor ??
      DEFAULT_PLAYER_APPEARANCE.displayColor,
  });

  if (profile.offlineBotCount !== undefined) {
    writeOfflineBotCount(profile.offlineBotCount);
  }
  if (profile.offlineBotDifficulty !== undefined) {
    writeOfflineBotDifficulty(profile.offlineBotDifficulty);
  }
  if (profile.randomMapOnStart !== undefined) {
    writeRandomMapOnStart(profile.randomMapOnStart);
  }
}
