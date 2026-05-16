import {
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "../game/appearance";
import { MapCatalogSelect } from "./MapCatalogSelect";
import { PlayerAppearanceSelect } from "./PlayerAppearanceSelect";
import styles from "./GameSettingsPanel.module.scss";

export type GameSettingsPanelProps = {
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  /** Сырое имя в профиле (до 32 симв.); пустое — подпись «Игрок N». */
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
  onFighterChange: (skin: FighterSkinId) => void;
  onBuildingChange: (skin: BuildingSkinId) => void;
  onDisplayColorChange: (color: DisplayColorId) => void;
  /** В комнате только хост меняет карту следующей партии. */
  mapCatalogDisabled?: boolean;
  /** Оффлайн: чекбокс «случайная карта при старте». */
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
};

export function GameSettingsPanel({
  mapId,
  onMapIdChange,
  mapSelectHint,
  displayName,
  onDisplayNameChange,
  fighter,
  building,
  displayColor,
  onFighterChange,
  onBuildingChange,
  onDisplayColorChange,
  mapCatalogDisabled = false,
  randomMapOnStart,
  onRandomMapOnStartChange,
}: GameSettingsPanelProps) {
  return (
    <>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Имя</h3>
        <label className={styles.nameField}>
          <input
            type="text"
            className={styles.nameInput}
            value={displayName}
            maxLength={32}
            autoComplete="nickname"
            placeholder="Как вас видят другие"
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
          <span className={styles.nameHint}>
            Пустое поле — в списке будет «Игрок N». Сохраняется в профиле.
          </span>
        </label>
      </div>

      <div className={styles.appearanceBlock}>
        <PlayerAppearanceSelect
          fighter={fighter}
          building={building}
          displayColor={displayColor}
          onFighterChange={onFighterChange}
          onBuildingChange={onBuildingChange}
          onDisplayColorChange={onDisplayColorChange}
        />
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Карта</h3>
        <div className={styles.mapCatalogWrap}>
          <MapCatalogSelect
            mapId={mapId}
            onMapIdChange={onMapIdChange}
            hint={mapSelectHint}
            showLabel={false}
            disabled={mapCatalogDisabled}
          />
        </div>
        {randomMapOnStart != null && onRandomMapOnStartChange ? (
          <label
            className={`${styles.mapRandomStartRow}${
              mapCatalogDisabled ? ` ${styles.mapRandomStartRowDisabled}` : ""
            }`}
          >
            <input
              type="checkbox"
              className={styles.mapRandomStartCheck}
              checked={randomMapOnStart}
              disabled={mapCatalogDisabled}
              onChange={(e) => onRandomMapOnStartChange(e.target.checked)}
            />
            <span className={styles.mapRandomStartLabel}>
              Случайная карта при загрузке страницы и «Новая игра»
            </span>
          </label>
        ) : null}
      </div>
    </>
  );
}
