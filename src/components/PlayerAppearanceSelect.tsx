import {
  BUILDING_SKIN_OPTIONS,
  DISPLAY_COLOR_OPTIONS,
  FIGHTER_SKIN_OPTIONS,
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "../game/appearance";
import { DisplayColorSelect } from "./DisplayColorSelect";
import { VisualSkinSelect } from "./VisualSkinSelect";
import styles from "./PlayerAppearanceSelect.module.scss";

type PlayerAppearanceSelectProps = {
  playerName: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
  onFighterChange: (skin: FighterSkinId) => void;
  onBuildingChange: (skin: BuildingSkinId) => void;
  onDisplayColorChange: (color: DisplayColorId) => void;
};

export function PlayerAppearanceSelect({
  playerName,
  fighter,
  building,
  displayColor,
  onFighterChange,
  onBuildingChange,
  onDisplayColorChange,
}: PlayerAppearanceSelectProps) {
  return (
    <div
      className={styles.row}
      role="group"
      aria-label={`Внешний вид: ${playerName}`}
    >
      <span className={styles.playerTag}>{playerName}</span>
      <VisualSkinSelect
        label="Бойцы"
        kind="fighter"
        value={fighter}
        options={FIGHTER_SKIN_OPTIONS}
        onChange={onFighterChange}
      />
      <VisualSkinSelect
        label="Здание"
        kind="building"
        value={building}
        options={BUILDING_SKIN_OPTIONS}
        onChange={onBuildingChange}
      />
      <DisplayColorSelect
        value={displayColor}
        options={DISPLAY_COLOR_OPTIONS}
        onChange={onDisplayColorChange}
      />
    </div>
  );
}
