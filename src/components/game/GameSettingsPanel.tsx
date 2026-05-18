import {
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "@/game/appearance";
import { PlayerAppearanceSelect } from "@/components/settings/PlayerAppearanceSelect";
import styles from "./GameSettingsPanel.module.scss";

export type GameSettingsPanelProps = {
  /** Сырое имя в профиле (до 32 симв.); пустое — подпись «Игрок N». */
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
  onFighterChange: (skin: FighterSkinId) => void;
  onBuildingChange: (skin: BuildingSkinId) => void;
  onDisplayColorChange: (color: DisplayColorId) => void;
  /** Аккаунт Google (вход / email). */
  accountEmail?: string | null;
  onGoogleSignIn?: () => void;
  googleSignInHint?: string | null;
};

export function GameSettingsPanel({
  displayName,
  onDisplayNameChange,
  fighter,
  building,
  displayColor,
  onFighterChange,
  onBuildingChange,
  onDisplayColorChange,
  accountEmail,
  onGoogleSignIn,
  googleSignInHint,
}: GameSettingsPanelProps) {
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
    </>
  );
}
