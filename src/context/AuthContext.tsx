import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchAuthSession, startGoogleSignIn } from "@/api/authApi";
import { isApiEnabled } from "@/api/config";
import type { RemoteUserProfile } from "@/api/profileApi";
import { applyRemoteProfileToLocal } from "@/lib/applyRemoteProfile";
import { getOrCreateUserId } from "@/lib/userId";

/** Временно скрыть кнопку «Войти через Google» в хедере и настройках. */
const GOOGLE_SIGN_IN_UI_ENABLED = false;

type AuthContextValue = {
  ready: boolean;
  /** Google OAuth настроен на сервере (есть client id / secret). */
  authConfigured: boolean;
  /** Показывать кнопку входа (API доступен, пользователь не вошёл). */
  showGoogleSignIn: boolean;
  isAuthenticated: boolean;
  user: RemoteUserProfile | null;
  userId: string;
  signInWithGoogle: () => void;
  refreshSession: () => Promise<void>;
  setUserFromProfile: (profile: RemoteUserProfile) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function stripAuthQuery(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("auth") && !url.searchParams.has("auth_error")) {
    return;
  }
  url.searchParams.delete("auth");
  url.searchParams.delete("auth_error");
  const next =
    url.pathname +
    (url.searchParams.toString() ? `?${url.searchParams}` : "") +
    url.hash;
  window.history.replaceState({}, "", next);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [user, setUser] = useState<RemoteUserProfile | null>(null);
  const [userId, setUserIdState] = useState(getOrCreateUserId);

  const setUserFromProfile = useCallback((profile: RemoteUserProfile) => {
    applyRemoteProfileToLocal(profile);
    setUser(profile);
    setUserIdState(profile.userId);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await fetchAuthSession();
    setAuthConfigured(session.authEnabled);
    if (session.user) {
      setUserFromProfile(session.user);
    } else {
      setUser(null);
      setUserIdState(getOrCreateUserId());
    }
  }, [setUserFromProfile]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await refreshSession();
      if (!cancelled) {
        setReady(true);
        stripAuthQuery();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const isAuthenticated = Boolean(user?.googleLinked);

  const signInWithGoogle = useCallback(() => {
    if (!authConfigured) {
      window.alert(
        "Google OAuth на сервере не настроен.\n\nСкопируйте server/.env.example → server/.env, укажите GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET и AUTH_SESSION_SECRET, затем перезапустите npm run dev:server."
      );
      return;
    }
    startGoogleSignIn();
  }, [authConfigured]);

  const showGoogleSignIn =
    GOOGLE_SIGN_IN_UI_ENABLED &&
    isApiEnabled() &&
    ready &&
    !isAuthenticated;

  const value = useMemo(
    (): AuthContextValue => ({
      ready,
      authConfigured,
      showGoogleSignIn,
      isAuthenticated,
      user,
      userId,
      signInWithGoogle,
      refreshSession,
      setUserFromProfile,
    }),
    [
      ready,
      authConfigured,
      showGoogleSignIn,
      isAuthenticated,
      user,
      userId,
      signInWithGoogle,
      refreshSession,
      setUserFromProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
