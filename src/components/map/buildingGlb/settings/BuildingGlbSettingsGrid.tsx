import { useState, type ReactElement } from "react";
import { useViewportMount } from "@/components/map/buildingGlb/webgl/useViewportMount";
import type { BuildingSkinId } from "@/game/appearance";
import type { SkinOption } from "@/game/appearance/catalog";
import {
  isGlbBuildingSkin,
  type GlbBuildingSkinId,
} from "@/components/map/buildingGlb/catalog";
import { buildingGlbShortLabel } from "@/components/map/buildingGlb/catalog/buildingGlbShortNames";
import { BuildingSpinSprite } from "@/components/map/buildingGlb/spin/BuildingSpinSprite";
import { hasBuildingSpinSheet } from "@/components/map/buildingGlb/spin/buildingSpinSheets";
import { SETTINGS_BUILDING_PREVIEW_PX } from "@/components/map/buildingGlb/constants/isoConstants";
import styles from "@/components/settings/PlayerAppearanceSelect.module.scss";

type BuildingGlbSettingsGridProps = {
  options: readonly SkinOption<BuildingSkinId>[];
  building: BuildingSkinId;
  onBuildingChange: (skin: BuildingSkinId) => void;
  scrollRoot: HTMLElement | null;
};

/** Центрирует карточку в горизонтальном скролле настроек. */
export function centerBuildingInSettingsViewport(
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

function BuildingGlbSettingsCell({
  opt,
  selected,
  onSelect,
  scrollRoot,
}: {
  opt: SkinOption<BuildingSkinId>;
  selected: boolean;
  onSelect: () => void;
  scrollRoot: HTMLElement | null;
}): ReactElement {
  const [cellEl, setCellEl] = useState<HTMLDivElement | null>(null);
  const visible = useViewportMount(cellEl, {
    root: scrollRoot,
    rootMargin: "32px",
    threshold: 0.08,
  });
  const size = SETTINGS_BUILDING_PREVIEW_PX;
  const skin = opt.id;
  const showSprite =
    isGlbBuildingSkin(skin) && hasBuildingSpinSheet(skin as GlbBuildingSkinId);
  const shortLabel = isGlbBuildingSkin(skin)
    ? buildingGlbShortLabel(skin as GlbBuildingSkinId)
    : opt.label;

  return (
    <div
      ref={setCellEl}
      className={styles.buildingGlbSettingsItem}
      {...(selected ? { "data-building-settings-selected": "" } : {})}
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
      >
        {showSprite ? (
          <div
            className="buildingGlbSettingsPreview"
            style={{ width: size, height: size }}
          >
            <BuildingSpinSprite
              skin={skin as GlbBuildingSkinId}
              size={size}
              phaseKey={`settings-${skin}`}
              animated={visible}
            />
          </div>
        ) : (
          <span className={styles.buildingPreviewPlaceholder} aria-hidden />
        )}
      </button>
      <span className={styles.buildingGlbShortLabel} title={opt.label}>
        {shortLabel}
      </span>
    </div>
  );
}

/**
 * Здания в настройках: запечённые спрайт-листы (без WebGL и без GLB в рантайме).
 */
export function BuildingGlbSettingsGrid({
  options,
  building,
  onBuildingChange,
  scrollRoot,
}: BuildingGlbSettingsGridProps): ReactElement {
  return (
    <div className={styles.buildingsGrid}>
      {options.map((opt) => (
        <BuildingGlbSettingsCell
          key={opt.id}
          opt={opt}
          selected={building === opt.id}
          onSelect={() => onBuildingChange(opt.id)}
          scrollRoot={scrollRoot}
        />
      ))}
    </div>
  );
}
