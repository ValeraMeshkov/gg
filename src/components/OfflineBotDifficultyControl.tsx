import {
  OFFLINE_BOT_DIFFICULTY,
  normalizeOfflineBotDifficulty,
} from "../../shared/offlineBotDifficulty";
import styles from "./OfflineBotDifficultyControl.module.scss";

type OfflineBotDifficultyControlProps = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export function OfflineBotDifficultyControl({
  value,
  onChange,
  className,
}: OfflineBotDifficultyControlProps) {
  return (
    <label
      className={[styles.root, className].filter(Boolean).join(" ")}
      title="Сложность ботов в одиночной игре"
    >
      <span className={styles.label}>Сложность</span>
      <input
        type="range"
        className={styles.range}
        min={OFFLINE_BOT_DIFFICULTY.min}
        max={OFFLINE_BOT_DIFFICULTY.max}
        step={1}
        value={value}
        aria-valuemin={OFFLINE_BOT_DIFFICULTY.min}
        aria-valuemax={OFFLINE_BOT_DIFFICULTY.max}
        aria-valuenow={value}
        aria-label="Сложность ботов"
        onChange={(e) =>
          onChange(normalizeOfflineBotDifficulty(Number(e.target.value)))
        }
      />
      <span className={styles.value}>{value}</span>
    </label>
  );
}
