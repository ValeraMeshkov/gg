import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  appearanceForPlayer,
  loadPlayerAppearances,
  type PlayerAppearance,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import {
  loadMyAppearance,
  saveMyAppearance,
  type MyAppearancePatch,
} from "@/game/appearance/myAppearance";
import { loadMyDisplayName, saveMyDisplayName } from "@/game/myDisplayName";
import {
  fetchRemoteProfile,
  saveMyRemoteProfile,
  saveRemoteProfile,
  ensureRemoteUser,
} from "@/api/profileApi";
import { useAuth } from "@/context/AuthContext";

const SAVE_DEBOUNCE_MS = 400;

type LocalBundle = { appearance: PlayerAppearance; displayName: string };

/**
 * Скины и имя текущего пользователя → localStorage + API.
 * Сначала localStorage, затем данные с сервера (Google-сессия).
 */
export function useSyncedPlayerAppearances(controlledPlayerId: string) {
  const {
    ready: authReady,
    userId,
    isAuthenticated,
    authConfigured,
    user: authUser,
    setUserFromProfile,
  } = useAuth();

  const [myAppearance, setMyAppearance] = useState<PlayerAppearance>(
    loadMyAppearance
  );
  const [displayName, setDisplayName] = useState(loadMyDisplayName);
  const [syncReady, setSyncReady] = useState(false);
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
    if (!authReady) return;
    if (authUser) {
      const remoteName = (authUser.displayName ?? "").trim().slice(0, 32);
      setMyAppearance((prev) => {
        const next: PlayerAppearance = {
          fighter: authUser.fighter,
          building: authUser.building,
          displayColor: authUser.displayColor ?? prev.displayColor,
        };
        saveMyAppearance(next);
        bundleRef.current = { appearance: next, displayName: remoteName };
        return next;
      });
      setDisplayName(remoteName);
      saveMyDisplayName(remoteName);
      setSyncReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const ensured = await ensureRemoteUser(userId);
        if (cancelled) return;

        const remote = await fetchRemoteProfile(ensured);
        if (cancelled) return;

        if (remote) {
          const remoteName = (remote.displayName ?? "").trim().slice(0, 32);
          setMyAppearance((prev) => {
            const next: PlayerAppearance = {
              fighter: remote.fighter,
              building: remote.building,
              displayColor: remote.displayColor ?? prev.displayColor,
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
  }, [authReady, authUser, userId]);

  const flushToServer = useCallback(() => {
    const { appearance, displayName: name } = bundleRef.current;
    saveMyAppearance(appearance);
    saveMyDisplayName(name);

    const patch = {
      fighter: appearance.fighter,
      building: appearance.building,
      displayName: name.trim(),
      displayColor: appearance.displayColor,
    };

    if (authConfigured && !isAuthenticated) return;

    const save = isAuthenticated
      ? saveMyRemoteProfile(patch)
      : saveRemoteProfile(userId, patch);

    void save
      .then((updated) => {
        if (updated) setUserFromProfile(updated);
      })
      .catch((err) => console.warn("[profile] сохранение на сервер", err));
  }, [authConfigured, isAuthenticated, userId, setUserFromProfile]);

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

  const controlledAppearance = useMemo(
    () => appearanceForPlayer(playerAppearances, controlledPlayerId),
    [playerAppearances, controlledPlayerId]
  );

  return {
    playerAppearances,
    controlledAppearance,
    patchMyAppearance,
    displayName,
    patchDisplayName,
    syncReady: syncReady && authReady,
  };
}
