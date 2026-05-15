import {
  BUILDING_SKIN_OPTIONS,
  FIGHTER_SKIN_OPTIONS,
  type BuildingSkinId,
  type FighterSkinId,
} from "../game/appearance";
import { VisualSkinSelect } from "./VisualSkinSelect";
import styles from "./PlayerAppearanceSelect.module.scss";

type PlayerAppearanceSelectProps = {
  playerName: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  onFighterChange: (skin: FighterSkinId) => void;
  onBuildingChange: (skin: BuildingSkinId) => void;
};

export function PlayerAppearanceSelect({
  playerName,
  fighter,
  building,
  onFighterChange,
  onBuildingChange,
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
    </div>
  );
}
