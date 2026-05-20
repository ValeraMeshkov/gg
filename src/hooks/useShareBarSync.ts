import { useEffect, useLayoutEffect, useMemo } from "react";
import type { GameShareBarPayload } from "@/context/GameShellContext";
import type { PlayerShareBarEntry } from "@/components/settings/PlayerShareBar";
import { shareBarColorForView } from "@/game/playerColors";
import { effectiveDisplayName } from "@/game/playerDisplayName";
import type { DisplayColorId, PlayerAppearancesMap } from "@/game/appearance";

function shareBarPayloadEqual(
  prev: GameShareBarPayload,
  players: readonly PlayerShareBarEntry[],
  activePlayerId: string
): boolean {
  if (!prev) return false;
  if (prev.activePlayerId !== activePlayerId) return false;
  if (prev.players.length !== players.length) return false;
  for (let i = 0; i < players.length; i++) {
    const a = prev.players[i]!;
    const b = players[i]!;
    if (
      a.id !== b.id ||
      a.score !== b.score ||
      a.displayName !== b.displayName ||
      a.colorIndex !== b.colorIndex ||
      a.barBackground !== b.barBackground
    ) {
      return false;
    }
  }
  return true;
}

type ShareBarSlot = {
  user: { id: string };
};

export function useShareBarSync(params: {
  setShareBar: (value: GameShareBarPayload | ((prev: GameShareBarPayload) => GameShareBarPayload)) => void;
  slots: readonly ShareBarSlot[];
  liveScores: ReadonlyMap<string, number>;
  localPlayerId: string;
  localDisplayColor: DisplayColorId;
  playerAppearances: PlayerAppearancesMap;
  nameBySlot: Record<string, string | undefined>;
}): void {
  const {
    setShareBar,
    slots,
    liveScores,
    localPlayerId,
    localDisplayColor,
    playerAppearances,
    nameBySlot,
  } = params;

  const shareBarPlayers = useMemo(() => {
    return slots.map((slot) => {
      const bar = shareBarColorForView(
        slot.user.id,
        localPlayerId,
        localDisplayColor,
        playerAppearances
      );
      return {
        id: slot.user.id,
        displayName: effectiveDisplayName(slot.user.id, nameBySlot[slot.user.id]),
        score: liveScores.get(slot.user.id) ?? 0,
        colorIndex: bar.colorIndex,
        barBackground: bar.background,
      };
    });
  }, [slots, liveScores, localPlayerId, localDisplayColor, playerAppearances, nameBySlot]);

  useLayoutEffect(() => {
    setShareBar((prev) => {
      const next = {
        players: shareBarPlayers,
        activePlayerId: localPlayerId,
      };
      if (shareBarPayloadEqual(prev, next.players, next.activePlayerId)) {
        return prev;
      }
      return next;
    });
  }, [shareBarPlayers, localPlayerId, setShareBar]);

  useEffect(() => () => setShareBar(null), [setShareBar]);
}
