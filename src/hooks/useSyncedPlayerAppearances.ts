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
import { loadMyDisplayName, saveMyDisplayName } from "../game/myDisplayName";
import {
  fetchRemoteProfile,
  saveRemoteProfile,
  ensureRemoteUser,
} from "../api/profileApi";
import { getOrCreateUserId } from "../lib/userId";

const SAVE_DEBOUNCE_MS = 400;

type LocalBundle = { appearance: PlayerAppearance; displayName: string };

/**
 * Скины и имя текущего браузерного пользователя → localStorage + API.
 * На карте применяются к выбранному слоту; mock-user-2/3 пока с дефолтами.
 */
export function useSyncedPlayerAppearances(controlledPlayerId: string) {
  const [myAppearance, setMyAppearance] = useState<PlayerAppearance>(
    loadMyAppearance
  );
  const [displayName, setDisplayName] = useState(loadMyDisplayName);
  const [syncReady, setSyncReady] = useState(false);
  const userIdRef = useRef(getOrCreateUserId());
  const saveTimerRef = useRef<number | null>(null);
  const bundleRef = useRef<LocalBundle>({
    appearance: loadMyAppearance(),
    displayName: loadMyDisplayName(),
  });
  bundleRef.current = { appearance: myAppearance, displayName };

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
          const remoteName = (remote.displayName ?? "").trim().slice(0, 32);
          setMyAppearance((prev) => {
            const next: PlayerAppearance = {
              fighter: remote.fighter,
              building: remote.building,
              displayColor: prev.displayColor,
            };
            saveMyAppearance(next);
            bundleRef.current = { appearance: next, displayName: remoteName };
            return next;
          });
          setDisplayName(remoteName);
          saveMyDisplayName(remoteName);
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

  const flushToServer = useCallback(() => {
    const { appearance, displayName: name } = bundleRef.current;
    saveMyAppearance(appearance);
    saveMyDisplayName(name);
    void saveRemoteProfile(userIdRef.current, {
      fighter: appearance.fighter,
      building: appearance.building,
      displayName: name.trim(),
    }).catch((err) => console.warn("[profile] сохранение на сервер", err));
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushToServer();
    }, SAVE_DEBOUNCE_MS);
  }, [flushToServer]);

  useEffect(
    () => () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
        flushToServer();
      }
    },
    [flushToServer]
  );

  const patchMyAppearance = useCallback(
    (patch: MyAppearancePatch) => {
      setMyAppearance((prev) => {
        const next = { ...prev, ...patch };
        bundleRef.current = { ...bundleRef.current, appearance: next };
        scheduleSave();
        return next;
      });
    },
    [scheduleSave]
  );

  const patchDisplayName = useCallback(
    (raw: string) => {
      const next = raw.slice(0, 32);
      setDisplayName(next);
      bundleRef.current = { ...bundleRef.current, displayName: next };
      saveMyDisplayName(next);
      scheduleSave();
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
    displayName,
    patchDisplayName,
    syncReady,
  };
}
