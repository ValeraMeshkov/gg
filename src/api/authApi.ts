import type { RemoteUserProfile } from "./profileApi";
import { apiFetch } from "./fetchApi";
import { apiUrl, isApiEnabled } from "./config";
import { getOrCreateUserId } from "@/lib/userId";

export type AuthSession = {
  user: RemoteUserProfile | null;
  authEnabled: boolean;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAuthSession(): Promise<AuthSession> {
  if (!isApiEnabled()) {
    return { user: null, authEnabled: false };
  }
  try {
    const res = await apiFetch("/api/auth/session");
    return parseJson<AuthSession>(res);
  } catch {
    return { user: null, authEnabled: false };
  }
}

export function googleSignInHref(linkUserId?: string): string {
  const id = linkUserId ?? getOrCreateUserId();
  const returnTo =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";
  const params = new URLSearchParams({
    linkUserId: id,
    returnTo,
  });
  return apiUrl(`/api/auth/google?${params.toString()}`);
}

export function startGoogleSignIn(): void {
  window.location.assign(googleSignInHref());
}
