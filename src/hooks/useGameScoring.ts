import { useMemo, type MutableRefObject } from "react";
import {
  offlineImmediateOutcomeForLocal,
  roomGameOutcomeForLocal,
} from "@/game/scoring/gameOutcome";
import {
  isPlayerAliveInMatch,
  matchScoreWithEliminationPenalty,
} from "@/game/scoring/matchElimination";
import { playerCanRecoverFromZeroScore } from "@/game/scoring/eliminationStrikes";
import {
  playerHadMatchPresence,
  playerScoresForRoom,
} from "@/game/scoring/playerScores";
import type { RoomGameOutcome } from "@/game/scoring/types";
import type { MapCell } from "@/game/maps/types";
import type { FlightPayload } from "@/game/projectiles/types";

type UseGameScoringOpts = {
  cells: readonly MapCell[];
  flightsRef: MutableRefObject<readonly FlightPayload[]>;
  eliminationPenaltyRef: MutableRefObject<Map<string, number>>;
  scoreSlotIds: readonly string[];
  localPlayerId: string;
  roomCode: string | null;
  scoreEpoch: number;
  /** Считать исход партии только во время активного боя (не лобби/подбор). */
  matchActive?: boolean;
};

export function useGameScoring({
  cells,
  flightsRef,
  eliminationPenaltyRef,
  scoreSlotIds,
  localPlayerId,
  roomCode,
  scoreEpoch,
  matchActive = true,
}: UseGameScoringOpts) {
  const liveScores = useMemo(() => {
    if (scoreSlotIds.length === 0) return new Map<string, number>();

    const flights = flightsRef.current;
    const raw = playerScoresForRoom(cells, flights, scoreSlotIds);
    const penalties = eliminationPenaltyRef.current;

    for (const id of scoreSlotIds) {
      const units = raw.get(id) ?? 0;
      if (units > 0) {
        penalties.delete(id);
      } else if (
        units === 0 &&
        !playerCanRecoverFromZeroScore(id, cells, flights) &&
        playerHadMatchPresence(id, cells, flights, units)
      ) {
        penalties.set(id, 1);
      }
    }

    const out = new Map<string, number>();
    for (const id of scoreSlotIds) {
      const penalty = penalties.get(id) ?? 0;
      out.set(id, matchScoreWithEliminationPenalty(raw.get(id) ?? 0, penalty));
    }
    return out;
  }, [cells, scoreSlotIds, scoreEpoch, eliminationPenaltyRef]);

  const gameOutcome = useMemo((): RoomGameOutcome | null => {
    if (!matchActive || scoreSlotIds.length < 2) return null;
    if (!roomCode) {
      const early = offlineImmediateOutcomeForLocal(
        scoreSlotIds,
        liveScores,
        localPlayerId
      );
      if (early != null) return early;
    }
    return roomGameOutcomeForLocal(
      scoreSlotIds,
      liveScores,
      localPlayerId,
      cells,
      flightsRef.current
    );
  }, [
    matchActive,
    roomCode,
    scoreSlotIds,
    liveScores,
    localPlayerId,
    cells,
    scoreEpoch,
    flightsRef,
  ]);

  const offlineAliveCount = useMemo(
    () =>
      scoreSlotIds.filter((id) =>
        isPlayerAliveInMatch(liveScores.get(id) ?? 0)
      ).length,
    [scoreSlotIds, liveScores, scoreEpoch]
  );

  return { liveScores, gameOutcome, offlineAliveCount };
}
