import { memo, type ReactElement } from "react";
import { getFighterSkinOptions, type FighterSkinId } from "@/game/appearance";
import { UI } from "@/constants/uiStrings";
import { FighterSettingsPreview } from "@/components/settings/FighterSettingsPreview";
import styles from "./MapSideFighterPicker.module.scss";

const PREVIEW_PX = 108;

type MapSideFighterPickerProps = {
  fighter: FighterSkinId;
  onFighterChange: (fighter: FighterSkinId) => void;
  disabled?: boolean;
};

export const MapSideFighterPicker = memo(function MapSideFighterPicker({
  fighter,
  onFighterChange,
  disabled = false,
}: MapSideFighterPickerProps): ReactElement {
  const options = getFighterSkinOptions();

  return (
    <div className={styles.root} role="radiogroup" aria-label={UI.weaponsSection}>
      <p className={styles.title}>{UI.weaponsSection}</p>
      <div className={styles.grid}>
        {options.map((opt) => {
          const selected = fighter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              data-map-action="fighter-pick"
              aria-checked={selected}
              aria-label={opt.label}
              title={opt.label}
              disabled={disabled}
              className={`${styles.item}${selected ? ` ${styles.itemSelected}` : ""}`}
              onClick={() => onFighterChange(opt.id)}
            >
              <FighterSettingsPreview
                fighter={opt.id}
                size={PREVIEW_PX}
                animated={selected}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});
