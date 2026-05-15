import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appearanceForPlayer,
  loadPlayerAppearances,
  type PlayerAppearance,
  type PlayerAppearancesMap,
} from "../game/appearance";
import {
  loadMyAppearance,
  saveMyAppearance,
  type MyAppearancePatch,
} from "../game/appearance/myAppearance";
import {
  fetchRemoteProfile,
  saveRemoteProfile,
  ensureRemoteUser,
} from "../api/profileApi";
import { getOrCreateUserId } from "../lib/userId";

const SAVE_DEBOUNCE_MS = 400;

/**
 * Скины текущего браузерного пользователя (fighter + building) → localStorage + API.
 * На карте применяются к выбранному слоту; mock-user-2/3 пока с дефолтами.
 */
export function useSyncedPlayerAppearances(controlledPlayerId: string) {
  const [myAppearance, setMyAppearance] = useState<PlayerAppearance>(loadMyAppearance);
  const [syncReady, setSyncReady] = useState(false);
  const userIdRef = useRef(getOrCreateUserId());
  const saveTimerRef = useRef<number | null>(null);
  const latestRef = useRef(myAppearance);
  latestRef.current = myAppearance;

  const playerAppearances = useMemo((): PlayerAppearancesMap => {
    const sessionDefaults = loadPlayerAppearances();
    return { ...sessionDefaults, [controlledPlayerId]: myAppearance };
  }, [controlledPlayerId, myAppearance]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const userId = await ensureRemoteUser(userIdRef.current);
        if (cancelled) return;
        userIdRef.current = userId;

        const remote = await fetchRemoteProfile(userId);
        if (cancelled) return;

        if (remote) {
          setMyAppearance((prev) => {
            const next: PlayerAppearance = {
              fighter: remote.fighter,
              building: remote.building,
              displayColor: prev.displayColor,
            };
            saveMyAppearance(next);
            return next;
          });
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

  const flushToServer = useCallback((appearance: PlayerAppearance) => {
    saveMyAppearance(appearance);
    void saveRemoteProfile(userIdRef.current, {
      fighter: appearance.fighter,
      building: appearance.building,
    }).catch((err) => console.warn("[profile] сохранение на сервер", err));
  }, []);

  const scheduleSave = useCallback(
    (appearance: PlayerAppearance) => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        flushToServer(appearance);
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

  const patchMyAppearance = useCallback(
    (patch: MyAppearancePatch) => {
      setMyAppearance((prev) => {
        const next = { ...prev, ...patch };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const controlledAppearance = appearanceForPlayer(
    playerAppearances,
    controlledPlayerId
  );

  return {
    playerAppearances,
    controlledAppearance,
    patchMyAppearance,
    syncReady,
  };
}
