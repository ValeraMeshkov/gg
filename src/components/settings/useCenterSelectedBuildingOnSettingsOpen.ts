import { useLayoutEffect, useRef } from "react";
import { centerBuildingInSettingsViewport } from "@/components/map/buildingGlb/settings/BuildingGlbSettingsGrid";

const VIEWPORT_SELECTOR = "[data-buildings-settings-viewport]";
const SELECTED_SELECTOR = "[data-building-settings-selected]";

function findSettingsBuildingScrollTargets(): {
  root: HTMLElement;
  el: HTMLElement;
} | null {
  const root = document.querySelector<HTMLElement>(VIEWPORT_SELECTOR);
  const el = root?.querySelector<HTMLElement>(SELECTED_SELECTOR) ?? null;
  if (!root || !el) return null;
  return { root, el };
}

/**
 * При открытии настроек прокручивает список зданий к выбранному (один раз).
 * Вызывать из AppGameChrome — он гарантированно перерисовывается при settingsOpen.
 */
export function useCenterSelectedBuildingOnSettingsOpen(
  settingsOpen: boolean
): void {
  const prevOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (!settingsOpen) {
      prevOpenRef.current = false;
      return;
    }

    const justOpened = !prevOpenRef.current;
    prevOpenRef.current = true;
    if (!justOpened) return;

    let cancelled = false;
    let centered = false;
    let ro: ResizeObserver | null = null;

    const center = (): boolean => {
      if (cancelled || centered) return centered;
      const targets = findSettingsBuildingScrollTargets();
      if (!targets) return false;
      if (centerBuildingInSettingsViewport(targets.root, targets.el)) {
        centered = true;
        ro?.disconnect();
        ro = null;
      }
      return centered;
    };

    const attachResizeObserver = () => {
      const targets = findSettingsBuildingScrollTargets();
      if (!targets || ro) return;
      ro = new ResizeObserver(() => {
        center();
      });
      ro.observe(targets.root);
      const grid = targets.root.firstElementChild;
      if (grid) ro.observe(grid);
    };

    center();
    attachResizeObserver();

    const raf = requestAnimationFrame(() => {
      center();
      attachResizeObserver();
      requestAnimationFrame(() => {
        center();
        attachResizeObserver();
      });
    });

    const timers = [50, 150, 300, 500].map((ms) =>
      window.setTimeout(() => {
        center();
        attachResizeObserver();
      }, ms)
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      ro?.disconnect();
    };
  }, [settingsOpen]);
}
