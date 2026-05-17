import handPng from "@/assets/hand.png";
import { allBuildingSpinSheetUrls } from "@/components/map/buildingGlb";
import { UI } from "@/constants/uiStrings";

export type PreloadProgress = {
  loaded: number;
  total: number;
  /** Короткая подпись этапа для экрана загрузки. */
  phase: string;
};

let preloadPromise: Promise<void> | null = null;

function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

function preloadUrl(url: string): Promise<void> {
  return fetch(url, { cache: "force-cache" })
    .then(() => undefined)
    .catch(() => undefined);
}

/**
 * Полная предзагрузка ассетов игры перед стартом.
 * Здания — PNG спрайт-листы (карта и настройки), без GLB в рантайме.
 */
export function preloadGameAssets(
  onProgress?: (progress: PreloadProgress) => void
): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      const spinUrls = allBuildingSpinSheetUrls();
      const staticUrls = [handPng, `${import.meta.env.BASE_URL}api-config.json`];
      const total = spinUrls.length + staticUrls.length;
      let loaded = 0;

      const tick = (phase: string) => {
        onProgress?.({ loaded, total, phase });
      };

      tick(UI.preloadBuildings);

      for (const url of spinUrls) {
        await preloadImage(url);
        loaded += 1;
        tick(UI.preloadBuildings);
      }

      tick(UI.preloadUi);
      for (const url of staticUrls) {
        await preloadUrl(url);
        if (url.endsWith(".png")) await preloadImage(url);
        loaded += 1;
        tick(UI.preloadUi);
      }

      onProgress?.({ loaded: total, total, phase: UI.preloadDone });
    } catch {
      onProgress?.({ loaded: 1, total: 1, phase: UI.preloadDone });
    }
  })();

  return preloadPromise;
}

/** @deprecated Используйте preloadGameAssets */
export function warmAllGlbBuildings(): Promise<void> {
  return preloadGameAssets();
}
