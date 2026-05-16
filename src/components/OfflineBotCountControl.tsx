import {
  OFFLINE_BOT_COUNT,
  normalizeOfflineBotCount,
} from "../../shared/offlineBotCount";
import styles from "./OfflineBotCountControl.module.scss";

type OfflineBotCountControlProps = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

export function OfflineBotCountControl({
  value,
  onChange,
  className,
}: OfflineBotCountControlProps) {
  const normalized = normalizeOfflineBotCount(value);

  return (
    <label
      className={[styles.root, className].filter(Boolean).join(" ")}
      title="Сколько соперников-ботов в одиночной игре"
    >
      <span className={styles.label}>Соперники</span>
      <input
        type="range"
        className={styles.range}
        min={OFFLINE_BOT_COUNT.min}
        max={OFFLINE_BOT_COUNT.max}
        step={1}
        value={normalized}
        aria-valuemin={OFFLINE_BOT_COUNT.min}
        aria-valuemax={OFFLINE_BOT_COUNT.max}
        aria-valuenow={normalized}
        aria-label="Количество соперников"
        onChange={(e) =>
          onChange(normalizeOfflineBotCount(Number(e.target.value)))
        }
      />
      <span className={styles.value}>{normalized}</span>
    </label>
  );
}
