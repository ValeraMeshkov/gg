import { useState, type ReactElement, type ReactNode } from "react";
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

/** Центрирует карточку в горизонтальном скролле настроек. */
export function centerAppearanceInSettingsViewport(
  root: HTMLElement,
  el: HTMLElement
): boolean {
  const max = root.scrollWidth - root.clientWidth;
  if (max <= 0) return false;

  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const itemLeft = elRect.left - rootRect.left + root.scrollLeft;
  const target = itemLeft + elRect.width / 2 - root.clientWidth / 2;
  root.scrollLeft = Math.max(0, Math.min(target, max));
  return true;
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
  const visible = useViewportMount(cellEl, {
    root: scrollRoot,
    rootMargin: "32px",
    threshold: 0.08,
  });
  const showPreview = hasPreview(opt);

  return (
    <div
      ref={setCellEl}
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
          <div
            className="buildingGlbSettingsPreview"
            style={{ width: previewSize, height: previewSize }}
          >
            {renderPreview({ opt, visible, size: previewSize })}
          </div>
        ) : (
          <span className={styles.buildingPreviewPlaceholder} aria-hidden />
        )}
      </button>
    </div>
  );
}

/** Горизонтальная сетка скинов в настройках (здания, бойцы). */
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
