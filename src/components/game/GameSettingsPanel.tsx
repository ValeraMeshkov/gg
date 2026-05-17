import {
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "@/game/appearance";
import { MapCatalogSelect } from "@/components/settings/MapCatalogSelect";
import { PlayerAppearanceSelect } from "@/components/settings/PlayerAppearanceSelect";
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
  /** Чекбокс «случайная карта». */
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  /** Подпись чекбокса (оффлайн / комната). */
  randomMapLabel?: string;
  /** Аккаунт Google (вход / email). */
  accountEmail?: string | null;
  onGoogleSignIn?: () => void;
  googleSignInHint?: string | null;
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
  randomMapLabel = "Случайная карта",
  accountEmail,
  onGoogleSignIn,
  googleSignInHint,
}: GameSettingsPanelProps) {
  const showRandomMap =
    randomMapOnStart != null && onRandomMapOnStartChange != null;

  return (
    <>
      {onGoogleSignIn || accountEmail ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Аккаунт</h3>
          {accountEmail ? (
            <p className={styles.accountEmail}>{accountEmail}</p>
          ) : onGoogleSignIn ? (
            <button
              type="button"
              className={styles.googleSignInBtn}
              onClick={onGoogleSignIn}
            >
              Войти через Google
            </button>
          ) : null}
          {googleSignInHint ? (
            <p className={styles.accountHint}>{googleSignInHint}</p>
          ) : null}
        </div>
      ) : null}

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
        <div className={styles.mapRow}>
          <div className={styles.mapSelectCol}>
            <MapCatalogSelect
              mapId={mapId}
              onMapIdChange={onMapIdChange}
              hint={mapSelectHint}
              showLabel={false}
              disabled={mapCatalogDisabled}
              size="large"
            />
          </div>
          {showRandomMap ? (
            <label
              className={`${styles.mapRandomCheck}${
                mapCatalogDisabled ? ` ${styles.mapRandomCheckDisabled}` : ""
              }`}
              title={randomMapLabel}
            >
              <input
                type="checkbox"
                className={styles.mapRandomCheckInput}
                checked={randomMapOnStart}
                disabled={mapCatalogDisabled}
                onChange={(e) => onRandomMapOnStartChange(e.target.checked)}
              />
              <span className={styles.mapRandomCheckLabel}>{randomMapLabel}</span>
            </label>
          ) : null}
        </div>
      </div>
    </>
  );
}
