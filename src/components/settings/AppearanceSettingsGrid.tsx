import { useCallback, useState, type ReactElement, type ReactNode } from "react";
import { useViewportMount } from "@/components/map/buildingGlb/webgl/useViewportMount";
import { SETTINGS_BUILDING_PREVIEW_PX } from "@/components/map/buildingGlb/constants/isoConstants";
import type { SkinOption } from "@/game/appearance/catalog";
import styles from "./PlayerAppearanceSelect.module.scss";

export type AppearanceSettingsPreviewProps<T extends string> = {
  opt: SkinOption<T>;
  visible: boolean;
  size: number;
};

export type AppearanceSettingsGridProps<T extends string> = {
  options: readonly SkinOption<T>[];
  selected: T;
  onSelect: (id: T) => void;
  scrollRoot: HTMLElement | null;
  ariaLabel: string;
  renderPreview: (ctx: AppearanceSettingsPreviewProps<T>) => ReactNode;
  /** false — кнопка с плейсхолдером (здание без спрайта). */
  hasPreview?: (opt: SkinOption<T>) => boolean;
  previewSize?: number;
};

/** Центрирует выбранный скин в области прокрутки (горизонтально или вертикально). */
export function centerAppearanceInSettingsViewport(
  root: HTMLElement,
  el: HTMLElement
): boolean {
  const horizontalOnly = root.dataset.scrollAxis === "x";
  if (horizontalOnly) {
    root.scrollTop = 0;
  }

  const maxX = root.scrollWidth - root.clientWidth;
  if (maxX > 0) {
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const itemLeft = elRect.left - rootRect.left + root.scrollLeft;
    const target = itemLeft + elRect.width / 2 - root.clientWidth / 2;
    root.scrollLeft = Math.max(0, Math.min(target, maxX));
    return true;
  }
  if (horizontalOnly) return true;

  const maxY = root.scrollHeight - root.clientHeight;
  if (maxY > 0) {
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const itemTop = elRect.top - rootRect.top + root.scrollTop;
    const target = itemTop + elRect.height / 2 - root.clientHeight / 2;
    root.scrollTop = Math.max(0, Math.min(target, maxY));
    return true;
  }
  return false;
}

/** @deprecated Используйте centerAppearanceInSettingsViewport */
export const centerBuildingInSettingsViewport = centerAppearanceInSettingsViewport;

function AppearanceSettingsCell<T extends string>({
  opt,
  selected,
  onSelect,
  scrollRoot,
  previewSize,
  hasPreview,
  renderPreview,
}: {
  opt: SkinOption<T>;
  selected: boolean;
  onSelect: () => void;
  scrollRoot: HTMLElement | null;
  previewSize: number;
  hasPreview: (opt: SkinOption<T>) => boolean;
  renderPreview: (ctx: AppearanceSettingsPreviewProps<T>) => ReactNode;
}): ReactElement {
  const [cellEl, setCellEl] = useState<HTMLDivElement | null>(null);
  const cellRef = useCallback((node: HTMLDivElement | null) => {
    setCellEl((prev) => (prev === node ? prev : node));
  }, []);
  const visible = useViewportMount(cellEl, {
    root: scrollRoot,
    rootMargin: "32px",
    threshold: 0.08,
  });
  const showPreview = hasPreview(opt);

  return (
    <div
      ref={cellRef}
      className={styles.buildingGlbSettingsItem}
      {...(selected ? { "data-appearance-settings-selected": "" } : {})}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        className={`${styles.cube} ${styles.cubeSkin} ${styles.cubeBuilding}${
          selected ? ` ${styles.cubeSelected}` : ""
        }`}
        onClick={onSelect}
        aria-label={opt.label}
        title={opt.label}
      >
        {showPreview ? (
          <div className={styles.buildingGlbSettingsPreview}>
            {renderPreview({ opt, visible, size: previewSize })}
          </div>
        ) : (
          <span className={styles.buildingPreviewPlaceholder} aria-hidden />
        )}
      </button>
    </div>
  );
}

/** Сетка скинов в окне настроек внешности (здания, бойцы и т.д.). */
export function AppearanceSettingsGrid<T extends string>({
  options,
  selected,
  onSelect,
  scrollRoot,
  ariaLabel,
  renderPreview,
  hasPreview = () => true,
  previewSize = SETTINGS_BUILDING_PREVIEW_PX,
}: AppearanceSettingsGridProps<T>): ReactElement {
  return (
    <div className={styles.buildingsGrid} role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <AppearanceSettingsCell
          key={opt.id}
          opt={opt}
          selected={selected === opt.id}
          onSelect={() => onSelect(opt.id)}
          scrollRoot={scrollRoot}
          previewSize={previewSize}
          hasPreview={hasPreview}
          renderPreview={renderPreview}
        />
      ))}
    </div>
  );
}
