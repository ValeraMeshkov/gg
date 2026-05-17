import { assignOfflineBotDisplayColors } from "@/shared/offlinePlayerColors";
import type { DisplayColorId } from "./appearance";
import type { PlayerAppearancesMap } from "./appearance";
import { OFFLINE_BOT_APPEARANCES, offlineBotIdsForCount } from "./mock";

/** Внешность ботов в оффлайн-партии с учётом цвета локального игрока. */
export function buildOfflineBotAppearances(
  botCount: number,
  localDisplayColor: DisplayColorId
): PlayerAppearancesMap {
  const botColors = assignOfflineBotDisplayColors(
    localDisplayColor,
    botCount
  );
  const out: PlayerAppearancesMap = {};
  offlineBotIdsForCount(botCount).forEach((id, i) => {
    const base = OFFLINE_BOT_APPEARANCES[id];
    if (!base) return;
    out[id] = { ...base, displayColor: botColors[i]! };
  });
  return out;
}
