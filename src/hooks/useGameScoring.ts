import { useMemo, type MutableRefObject } from "react";
import {
  offlineImmediateOutcomeForLocal,
  roomGameOutcomeForLocal,
} from "@/game/scoring/gameOutcome";
import { playerScoresForRoom } from "@/game/scoring/playerScores";
import type { RoomGameOutcome } from "@/game/scoring/types";
import type { MapCell } from "@/game/maps/types";
import type { FlightPayload } from "@/game/projectiles/types";

type UseGameScoringOpts = {
  cells: readonly MapCell[];
  flightsRef: MutableRefObject<readonly FlightPayload[]>;
  scoreSlotIds: readonly string[];
  localPlayerId: string;
  roomCode: string | null;
  scoreEpoch: number;
};

export function useGameScoring({
  cells,
  flightsRef,
  scoreSlotIds,
  localPlayerId,
  roomCode,
  scoreEpoch,
}: UseGameScoringOpts) {
  const liveScores = useMemo(
    () => playerScoresForRoom(cells, flightsRef.current, scoreSlotIds),
    [cells, scoreSlotIds, scoreEpoch]
  );

  const gameOutcome = useMemo((): RoomGameOutcome | null => {
    if (scoreSlotIds.length < 2) return null;
    if (!roomCode) {
      const early = offlineImmediateOutcomeForLocal(
        scoreSlotIds,
        liveScores,
        localPlayerId
      );
      if (early != null) return early;
    }
    return roomGameOutcomeForLocal(scoreSlotIds, liveScores, localPlayerId);
  }, [roomCode, scoreSlotIds, liveScores, localPlayerId, scoreEpoch]);

  const offlineAliveCount = useMemo(
    () =>
      scoreSlotIds.filter((id) => (liveScores.get(id) ?? 0) > 0).length,
    [scoreSlotIds, liveScores, scoreEpoch]
  );

  return { liveScores, gameOutcome, offlineAliveCount };
}
