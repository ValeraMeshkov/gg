import {
  BUILDING_SKIN_OPTIONS,
  DISPLAY_COLOR_OPTIONS,
  FIGHTER_SKIN_OPTIONS,
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "../game/appearance";
import { SkinPreviewIcon } from "./map/SkinPreviewIcon";
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
  return (
    <div className={styles.root}>
      <div className={styles.rowBlock}>
        <p className={styles.rowLabel}>Ваш цвет</p>
        <div
          className={styles.cubeRow}
          role="radiogroup"
          aria-label="Ваш цвет"
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
                onClick={() => onDisplayColorChange(opt.id)}
                aria-label={opt.label}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.rowBlock}>
        <p className={styles.rowLabel}>Здания</p>
        <div className={styles.cubeRow} role="radiogroup" aria-label="Здания">
          {BUILDING_SKIN_OPTIONS.map((opt) => {
            const selected = building === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.cube} ${styles.cubeSkin}${
                  selected ? ` ${styles.cubeSelected}` : ""
                }`}
                onClick={() => onBuildingChange(opt.id)}
                aria-label={opt.label}
              >
                <SkinPreviewIcon kind="building" skin={opt.id} size={42} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.rowBlock}>
        <p className={styles.rowLabel}>Бойцы</p>
        <div className={styles.cubeRow} role="radiogroup" aria-label="Бойцы">
          {FIGHTER_SKIN_OPTIONS.map((opt) => {
            const selected = fighter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.cube} ${styles.cubeSkin}${
                  selected ? ` ${styles.cubeSelected}` : ""
                }`}
                onClick={() => onFighterChange(opt.id)}
                aria-label={opt.label}
              >
                <SkinPreviewIcon kind="fighter" skin={opt.id} size={42} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
