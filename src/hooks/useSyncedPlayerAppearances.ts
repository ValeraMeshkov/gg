import { useCallback, useEffect, useRef, useState } from "react";
import {
  appearanceForPlayer,
  loadPlayerAppearances,
  savePlayerAppearances,
  type PlayerAppearancesMap,
} from "../game/appearance";
import {
  fetchRemoteProfile,
  saveRemoteProfile,
  ensureRemoteUser,
  type AppearancePatch,
} from "../api/profileApi";
import { getOrCreateUserId, setUserId } from "../lib/userId";

const SAVE_DEBOUNCE_MS = 400;

function mergeAppearances(
  local: PlayerAppearancesMap,
  remote: PlayerAppearancesMap | undefined
): PlayerAppearancesMap {
  if (!remote) return local;
  return { ...local, ...remote };
}

/**
 * Внешний вид игроков: localStorage + синхронизация с API (если доступен).
 */
export function useSyncedPlayerAppearances() {
  const [playerAppearances, setPlayerAppearances] =
    useState<PlayerAppearancesMap>(loadPlayerAppearances);
  const [syncReady, setSyncReady] = useState(false);
  const userIdRef = useRef(getOrCreateUserId());
  const saveTimerRef = useRef<number | null>(null);
  const latestRef = useRef(playerAppearances);
  latestRef.current = playerAppearances;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let userId = userIdRef.current;
        userId = await ensureRemoteUser(userId);
        if (cancelled) return;
        if (userId !== userIdRef.current) {
          userIdRef.current = userId;
          setUserId(userId);
        }

        const remote = await fetchRemoteProfile(userId);
        if (cancelled) return;

        if (remote?.appearances) {
          const merged = mergeAppearances(
            loadPlayerAppearances(),
            remote.appearances
          );
          setPlayerAppearances(merged);
          savePlayerAppearances(merged);
        }
      } catch (err) {
        console.warn("[profile] синхронизация с сервером не удалась", err);
      } finally {
        if (!cancelled) setSyncReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const flushToServer = useCallback((map: PlayerAppearancesMap) => {
    savePlayerAppearances(map);
    void saveRemoteProfile(userIdRef.current, { appearances: map }).catch(
      (err) => console.warn("[profile] сохранение на сервер", err)
    );
  }, []);

  const scheduleSave = useCallback(
    (map: PlayerAppearancesMap) => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        flushToServer(map);
      }, SAVE_DEBOUNCE_MS);
    },
    [flushToServer]
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        flushToServer(latestRef.current);
      }
    },
    [flushToServer]
  );

  const patchPlayerAppearance = useCallback(
    (playerId: string, patch: AppearancePatch) => {
      setPlayerAppearances((prev) => {
        const next = {
          ...prev,
          [playerId]: {
            ...appearanceForPlayer(prev, playerId),
            ...patch,
          },
        };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  return {
    playerAppearances,
    patchPlayerAppearance,
    syncReady,
  };
}
