import { useEffect, useState, type RefCallback } from "react";
import {
  DISPLAY_COLOR_OPTIONS,
  getBuildingSkinOptions,
  getFighterSkinOptions,
  fighterSkinShortLabel,
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "@/game/appearance";
import {
  BuildingGlbSettingsGrid,
  GLB_BUILDING_VISIBILITY_CHANGE_EVENT,
} from "@/components/map/buildingGlb";
import { AppearanceSettingsGrid } from "@/components/settings/AppearanceSettingsGrid";
import { FighterSettingsPreview } from "@/components/settings/FighterSettingsPreview";
import { DEFAULT_BUILDING_SKIN } from "@/shared/skinIds";
import styles from "./PlayerAppearanceSelect.module.scss";

type PlayerAppearanceSelectProps = {
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
  onFighterChange: (skin: FighterSkinId) => void;
  onBuildingChange: (skin: BuildingSkinId) => void;
  onDisplayColorChange: (color: DisplayColorId) => void;
};

export function PlayerAppearanceSelect({
  fighter,
  building,
  displayColor,
  onFighterChange,
  onBuildingChange,
  onDisplayColorChange,
}: PlayerAppearanceSelectProps) {
  const [buildingOptions, setBuildingOptions] = useState(
    getBuildingSkinOptions
  );
  const fighterOptions = getFighterSkinOptions();
  const [buildingsScrollRoot, setBuildingsScrollRoot] =
    useState<HTMLDivElement | null>(null);
  const [fightersScrollRoot, setFightersScrollRoot] =
    useState<HTMLDivElement | null>(null);
  const buildingsViewportRef: RefCallback<HTMLDivElement> = (node) => {
    setBuildingsScrollRoot(node);
  };
  const fightersViewportRef: RefCallback<HTMLDivElement> = (node) => {
    setFightersScrollRoot(node);
  };

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

  return (
    <div className={styles.root}>
      <div className={styles.rowBlock}>
        <p className={styles.rowLabel}>Ваш цвет</p>
        <div className={styles.cubeRow} role="radiogroup" aria-label="Ваш цвет">
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
                onClick={() => onDisplayColorChange(opt.id)}
                aria-label={opt.label}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.rowBlock}>
        <p className={styles.rowLabel}>Здания</p>
        <div
          ref={buildingsViewportRef}
          className={styles.buildingsViewport}
          data-appearance-settings-viewport=""
          role="presentation"
        >
          <BuildingGlbSettingsGrid
            options={buildingOptions}
            building={building}
            onBuildingChange={onBuildingChange}
            scrollRoot={buildingsScrollRoot}
          />
        </div>
      </div>

      <div className={styles.rowBlock}>
        <p className={styles.rowLabel}>Бойцы</p>
        <div
          ref={fightersViewportRef}
          className={styles.buildingsViewport}
          data-appearance-settings-viewport=""
          role="presentation"
        >
          <AppearanceSettingsGrid
            options={fighterOptions}
            selected={fighter}
            onSelect={onFighterChange}
            scrollRoot={fightersScrollRoot}
            ariaLabel="Бойцы"
            getShortLabel={(opt) => fighterSkinShortLabel(opt.id)}
            renderPreview={({ opt, visible, size }) => (
              <FighterSettingsPreview
                fighter={opt.id}
                size={size}
                animated={visible}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}
