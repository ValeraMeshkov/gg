import { useAuth } from "@/context/AuthContext";
import { getOrCreateUserId } from "@/lib/userId";

/** Актуальный userId: из Google-сессии или localStorage. */
export function useUserId(): string {
  const { ready, userId } = useAuth();
  if (!ready) return getOrCreateUserId();
  return userId;
}
