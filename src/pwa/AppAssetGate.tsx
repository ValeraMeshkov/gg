import {
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { UI } from "@/constants/uiStrings";
import { preloadGameAssets, type PreloadProgress } from "./preloadGameAssets";
import styles from "./AppAssetGate.module.scss";

const MIN_SPLASH_MS = 450;
/** Не держать сплэш дольше — даже если preload завис. */
const MAX_SPLASH_MS = 50_000;

type AppAssetGateProps = {
  children: ReactNode;
};

function BootstrapScreen({
  progress,
}: {
  progress: PreloadProgress;
}): ReactElement {
  const pct =
    progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : 0;

  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <div className={styles.card}>
        <p className={styles.title}>Territory</p>
        <p className={styles.phase}>{progress.phase}</p>
        <div className={styles.barTrack} aria-hidden>
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.count}>
          {progress.loaded} / {progress.total}
        </p>
      </div>
    </div>
  );
}

/** Блокирует игру, пока не загружены GLB и прочие ассеты. */
export function AppAssetGate({ children }: AppAssetGateProps): ReactElement {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: 1,
    phase: UI.preloadBoot,
  });

  useEffect(() => {
    let cancelled = false;

    const minDelay = new Promise<void>((resolve) => {
      window.setTimeout(resolve, MIN_SPLASH_MS);
    });

    const boot = Promise.all([
      preloadGameAssets((p) => {
        if (!cancelled) setProgress(p);
      }),
      minDelay,
    ]);

    void Promise.race([
      boot,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, MAX_SPLASH_MS);
      }),
    ]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <BootstrapScreen progress={progress} />;
  }

  return <>{children}</>;
}
