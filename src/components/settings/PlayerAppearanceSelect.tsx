import { useCallback, useEffect, useState } from "react";
import {
  DISPLAY_COLOR_OPTIONS,
  getBuildingSkinOptions,
  getFighterSkinOptions,
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "@/game/appearance";
import {
  BuildingGlbSettingsGrid,
  GLB_BUILDING_VISIBILITY_CHANGE_EVENT,
} from "@/components/map/buildingGlb";
import { BuildingSkinDescription } from "@/components/settings/BuildingSkinDescription";
import { DEFAULT_BUILDING_SKIN } from "@/shared/skinIds";
import { UI } from "@/constants/uiStrings";
import styles from "./PlayerAppearanceSelect.module.scss";

type PlayerAppearanceSelectProps = {
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
  onFighterChange: (skin: FighterSkinId) => void;
  onBuildingChange: (skin: BuildingSkinId) => void;
  onDisplayColorChange: (color: DisplayColorId) => void;
  /** Одиночная игра в доке: черновик имени рядом с палитрой. */
  draftDisplayName?: string;
  onDraftDisplayNameChange?: (value: string) => void;
  appearanceLocked?: boolean;
};

export function PlayerAppearanceSelect({
  fighter,
  building,
  displayColor,
  onFighterChange,
  onBuildingChange,
  onDisplayColorChange,
  draftDisplayName,
  onDraftDisplayNameChange,
  appearanceLocked = false,
}: PlayerAppearanceSelectProps) {
  const [buildingOptions, setBuildingOptions] = useState(
    getBuildingSkinOptions
  );
  const fighterOptions = getFighterSkinOptions();
  const [buildingsScrollRoot, setBuildingsScrollRoot] =
    useState<HTMLDivElement | null>(null);
  const buildingsViewportRef = useCallback((node: HTMLDivElement | null) => {
    setBuildingsScrollRoot((prev) => (prev === node ? prev : node));
  }, []);

  useEffect(() => {
    const sync = () => setBuildingOptions(getBuildingSkinOptions());
    window.addEventListener(GLB_BUILDING_VISIBILITY_CHANGE_EVENT, sync);
    return () =>
      window.removeEventListener(GLB_BUILDING_VISIBILITY_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (buildingOptions.some((o) => o.id === building)) return;
    const fallback = buildingOptions[0]?.id ?? DEFAULT_BUILDING_SKIN;
    if (fallback !== building) onBuildingChange(fallback);
  }, [building, buildingOptions, onBuildingChange]);

  useEffect(() => {
    if (fighterOptions.some((o) => o.id === fighter)) return;
    const fallback = fighterOptions[0]?.id ?? "bomb";
    if (fallback !== fighter) onFighterChange(fallback);
  }, [fighter, fighterOptions, onFighterChange]);

  const showNameWithColor = Boolean(onDraftDisplayNameChange);

  const colorRadiogroupLabel = showNameWithColor
    ? UI.soloDockColor
    : UI.soloDockYourColor;

  const colorRadiogroup = (
    <div
      className={styles.cubeRow}
      role="radiogroup"
      aria-label={colorRadiogroupLabel}
    >
      {DISPLAY_COLOR_OPTIONS.map((opt) => {
        const selected = displayColor === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`${styles.cube} ${styles.cubeColor}${
              selected ? ` ${styles.cubeSelected}` : ""
            }`}
            style={{ backgroundColor: opt.swatch }}
            disabled={appearanceLocked}
            onClick={() => onDisplayColorChange(opt.id)}
            aria-label={opt.label}
          />
        );
      })}
    </div>
  );

  return (
    <div
      className={`${styles.root}${appearanceLocked ? ` ${styles.rootLocked}` : ""}`}
    >
      <div className={styles.rowBlock}>
        {showNameWithColor ? (
          <div className={styles.nameColorSplit}>
            <p className={styles.rowLabel}>{UI.soloDockChooseName}</p>
            <p className={styles.rowLabel}>{UI.soloDockColor}</p>
            <div className={styles.nameInputGridCell}>
              <input
                type="text"
                className={styles.nameInputInline}
                value={draftDisplayName ?? ""}
                maxLength={32}
                autoComplete="nickname"
                placeholder={UI.displayNamePlaceholder}
                disabled={appearanceLocked}
                onChange={(e) => onDraftDisplayNameChange?.(e.target.value)}
                aria-label={UI.soloDockChooseName}
              />
            </div>
            <div className={styles.colorSwatchesScroll}>{colorRadiogroup}</div>
          </div>
        ) : (
          <>
            <p className={styles.rowLabel}>{UI.soloDockYourColor}</p>
            <div className={styles.colorRowOnly}>{colorRadiogroup}</div>
          </>
        )}
      </div>

      <div className={`${styles.rowBlock} ${styles.buildingPickerBlock}`}>
        <p className={styles.rowLabel}>Здания</p>
        <div className={styles.buildingPickerRow}>
          <div
            ref={buildingsViewportRef}
            className={styles.buildingsViewport}
            data-appearance-settings-viewport=""
            data-scroll-axis="x"
            role="presentation"
          >
            <BuildingGlbSettingsGrid
              options={buildingOptions}
              building={building}
              onBuildingChange={onBuildingChange}
              scrollRoot={buildingsScrollRoot}
            />
          </div>

          <div className={styles.buildingDescPane}>
            <BuildingSkinDescription
              building={building}
              className={styles.buildingDescriptionEmbed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
