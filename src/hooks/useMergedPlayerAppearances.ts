import { useMemo } from "react";
import type { PlayerAppearance, PlayerAppearancesMap } from "@/game/appearance";
import { buildOfflineBotAppearances } from "@/game/offlineBotAppearances";
import { applyResolvedRoomColors } from "@/shared/roomPlayerColors";

type UseMergedPlayerAppearancesOpts = {
  base: PlayerAppearancesMap;
  room: PlayerAppearancesMap;
  localPlayerId: string;
  localAppearance: PlayerAppearance;
  /** Оффлайн: число ботов; в комнате — 0 или не передавать. */
  offlineBotCount: number;
  isRoom: boolean;
};

/** Единая карта внешности для карты, пуль и share bar (оффлайн + комната). */
export function useMergedPlayerAppearances({
  base,
  room,
  localPlayerId,
  localAppearance,
  offlineBotCount,
  isRoom,
}: UseMergedPlayerAppearancesOpts): PlayerAppearancesMap {
  const offlineBots = useMemo(() => {
    if (isRoom) return {};
    return buildOfflineBotAppearances(
      offlineBotCount,
      localAppearance.displayColor
    );
  }, [isRoom, offlineBotCount, localAppearance.displayColor]);

  const { fighter, building, displayColor } = localAppearance;

  const roomResolved = useMemo(() => {
    if (!isRoom || Object.keys(room).length === 0) return room;
    return applyResolvedRoomColors(room);
  }, [isRoom, room]);

  const roomLocal = roomResolved[localPlayerId];

  return useMemo(
    (): PlayerAppearancesMap => ({
      ...base,
      ...roomResolved,
      ...offlineBots,
      [localPlayerId]: {
        fighter,
        building,
        displayColor: roomLocal?.displayColor ?? displayColor,
      },
    }),
    [
      base,
      roomResolved,
      offlineBots,
      localPlayerId,
      fighter,
      building,
      displayColor,
      roomLocal?.displayColor,
    ]
  );
}
