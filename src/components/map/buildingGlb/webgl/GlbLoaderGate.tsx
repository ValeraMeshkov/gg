import { useEffect, useState, type ReactNode, type ReactElement } from "react";
import { isGlbLoaderReady, prepareGlbLoader } from "./glbLoaderExtensions";

/** Не рендерить GLB, пока meshopt-декодер не готов (иначе падает загрузка). */
export function GlbLoaderGate({ children }: { children: ReactNode }): ReactElement | null {
  const [ok, setOk] = useState(isGlbLoaderReady);

  useEffect(() => {
    if (ok) return;
    let cancelled = false;
    void prepareGlbLoader().then(() => {
      if (!cancelled) setOk(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ok]);

  if (!ok) return null;
  return <>{children}</>;
}
