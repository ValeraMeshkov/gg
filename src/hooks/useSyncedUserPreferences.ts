import { useCallback, useEffect, useRef } from "react";
import { saveMyRemoteProfile, type ProfilePatch } from "@/api/profileApi";
import { useAuth } from "@/context/AuthContext";

const SAVE_DEBOUNCE_MS = 500;

/**
 * Дебаунс-сохранение оффлайн-настроек на сервер для Google-пользователя.
 */
export function useSyncedUserPreferences() {
  const { ready, isAuthenticated, authConfigured, setUserFromProfile } = useAuth();
  const timerRef = useRef<number | null>(null);

  const flush = useCallback(
    (patch: ProfilePatch) => {
      if (!ready || !authConfigured || !isAuthenticated) return;
      void saveMyRemoteProfile(patch)
        .then((updated) => {
          if (updated) setUserFromProfile(updated);
        })
        .catch((err) =>
          console.warn("[prefs] сохранение на сервер", err)
        );
    },
    [ready, authConfigured, isAuthenticated, setUserFromProfile]
  );

  const scheduleSave = useCallback(
    (patch: ProfilePatch) => {
      if (!ready || !authConfigured || !isAuthenticated) return;
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        flush(patch);
      }, SAVE_DEBOUNCE_MS);
    },
    [ready, authConfigured, isAuthenticated, flush]
  );

  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    []
  );

  return { scheduleSave };
}
