import { useEffect, useRef, type MutableRefObject } from "react";
import { OFFLINE_BOT_START_DELAY_MS } from "@/shared/offlineBotDifficulty";
import type { MapCell } from "@/game/maps/types";
import { offlineBotIdsForCount, pickOfflineBotAttack } from "@/game/mock";
import type { OfflineBotFlightsInput } from "@/game/mock";
import type { GameMap } from "@/game/maps/types";
import type { CellPos } from "@/game/maps";
import type { FlightPayload } from "@/game/projectiles/types";
import type { PlayerAppearancesMap } from "@/game/appearance";
import { offlineBotThinkDelayMs } from "@/shared/offlineBotDifficulty";

type UseOfflineBotLoopOpts = {
  enabled: boolean;
  sessionMap: GameMap;
  cellsRef: MutableRefObject<MapCell[]>;
  flightsRef: MutableRefObject<FlightPayload[]>;
  botCount: number;
  difficulty: number;
  playerAppearancesRef: MutableRefObject<PlayerAppearancesMap>;
  runAttack: (
    froms: readonly CellPos[],
    to: CellPos,
    attackerId: string,
    baseTime?: number,
    maxUnitsPerSource?: number
  ) => void;
};

export function useOfflineBotLoop({
  enabled,
  sessionMap,
  cellsRef,
  flightsRef,
  botCount,
  difficulty,
  playerAppearancesRef,
  runAttack,
}: UseOfflineBotLoopOpts): void {
  const armedRef = useRef(false);
  const graceScheduledRef = useRef(false);
  const difficultyRef = useRef(difficulty);
  const botCountRef = useRef(botCount);
  const runAttackRef = useRef(runAttack);
  difficultyRef.current = difficulty;
  botCountRef.current = botCount;
  runAttackRef.current = runAttack;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timeoutByBot = new Map<string, number>();

    const armBot = (botId: string) => {
      const step = () => {
        if (cancelled) return;
        const delay = offlineBotThinkDelayMs(
          Math.random,
          difficultyRef.current
        );
        const tid = window.setTimeout(() => {
          if (cancelled) return;
          const move = pickOfflineBotAttack(
            sessionMap,
            cellsRef.current,
            botId,
            flightsRef.current as OfflineBotFlightsInput,
            {
              difficulty: difficultyRef.current,
              appearances: playerAppearancesRef.current,
            }
          );
          if (move) {
            runAttackRef.current(
              move.froms,
              move.to,
              move.botId,
              undefined,
              move.maxUnits
            );
          }
          step();
        }, delay);
        timeoutByBot.set(botId, tid);
      };
      step();
    };

    const startBots = () => {
      if (cancelled || armedRef.current) return;
      armedRef.current = true;
      for (const botId of offlineBotIdsForCount(botCountRef.current)) {
        armBot(botId);
      }
    };

    let graceTimeoutId: number | undefined;

    if (!armedRef.current && !graceScheduledRef.current) {
      graceScheduledRef.current = true;
      graceTimeoutId = window.setTimeout(() => {
        graceTimeoutId = undefined;
        startBots();
      }, OFFLINE_BOT_START_DELAY_MS);
    }

    return () => {
      cancelled = true;
      armedRef.current = false;
      graceScheduledRef.current = false;
      if (graceTimeoutId !== undefined) {
        window.clearTimeout(graceTimeoutId);
      }
      for (const tid of timeoutByBot.values()) {
        window.clearTimeout(tid);
      }
    };
  }, [enabled, sessionMap, cellsRef, flightsRef]);
}
