import { useLayoutEffect, useRef } from "react";
import { centerAppearanceInSettingsViewport } from "@/components/settings/AppearanceSettingsGrid";

const VIEWPORT_SELECTOR = "[data-appearance-settings-viewport]";
const SELECTED_SELECTOR = "[data-appearance-settings-selected]";

function findAppearanceScrollTargets(): { root: HTMLElement; el: HTMLElement }[] {
  const targets: { root: HTMLElement; el: HTMLElement }[] = [];
  const roots = document.querySelectorAll<HTMLElement>(VIEWPORT_SELECTOR);
  for (const root of roots) {
    const el = root.querySelector<HTMLElement>(SELECTED_SELECTOR);
    if (el) targets.push({ root, el });
  }
  return targets;
}

/**
 * При открытии настроек прокручивает списки зданий и бойцов к выбранным (один раз).
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
      const targets = findAppearanceScrollTargets();
      if (targets.length === 0) return false;
      let any = false;
      for (const { root, el } of targets) {
        if (centerAppearanceInSettingsViewport(root, el)) any = true;
      }
      if (any) {
        centered = true;
        ro?.disconnect();
        ro = null;
      }
      return centered;
    };

    const attachResizeObserver = () => {
      const targets = findAppearanceScrollTargets();
      if (targets.length === 0 || ro) return;
      ro = new ResizeObserver(() => {
        center();
      });
      for (const { root } of targets) {
        ro.observe(root);
        const grid = root.firstElementChild;
        if (grid) ro.observe(grid);
      }
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
