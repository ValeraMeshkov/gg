import type { DisplayColorId } from "./appearance";
import type { PlayerAppearancesMap } from "./appearance";
import { rollOfflineBotRoster } from "@/shared/offlineBotRoster";
import { offlineBotIdsForCount } from "./mock";

/** Внешность ботов в оффлайн-партии (случайное здание и оружие на партию). */
export function buildOfflineBotAppearances(
  botCount: number,
  localDisplayColor: DisplayColorId,
  sessionSeed: string
): PlayerAppearancesMap {
  const ids = offlineBotIdsForCount(botCount);
  const roster = rollOfflineBotRoster(sessionSeed, ids, localDisplayColor);
  const out: PlayerAppearancesMap = {};
  for (const id of ids) {
    const entry = roster[id];
    if (entry) out[id] = entry;
  }
  return out;
}
