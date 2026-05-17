import { useEffect, type ReactElement } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import styles from "./PwaShell.module.scss";

/** Баннеры: офлайн готов, доступно обновление PWA. */
export function PwaShell(): ReactElement | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisterError(error) {
      console.warn("[pwa] регистрация service worker", error);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const t = window.setTimeout(() => setOfflineReady(false), 5000);
    return () => window.clearTimeout(t);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className={styles.root} role="status" aria-live="polite">
      {offlineReady ? (
        <p className={styles.message}>
          Игра сохранена в кэше — здания и файлы доступны без сети.
        </p>
      ) : null}
      {needRefresh ? (
        <div className={styles.row}>
          <p className={styles.message}>Доступна новая версия игры.</p>
          <button
            type="button"
            className={styles.btn}
            onClick={() => void updateServiceWorker(true)}
          >
            Обновить
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => setNeedRefresh(false)}
          >
            Позже
          </button>
        </div>
      ) : null}
    </div>
  );
}
