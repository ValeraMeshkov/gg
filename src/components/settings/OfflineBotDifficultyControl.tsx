import {
  OFFLINE_BOT_DIFFICULTY,
  normalizeOfflineBotDifficulty,
} from "@/shared/offlineBotDifficulty";
import { HeaderLabeledRange } from "./HeaderLabeledRange";

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
  const normalized = normalizeOfflineBotDifficulty(value);

  return (
    <HeaderLabeledRange
      className={className}
      wide
      label="Сложность"
      value={normalized}
      min={OFFLINE_BOT_DIFFICULTY.min}
      max={OFFLINE_BOT_DIFFICULTY.max}
      step={1}
      title="Сложность ботов в одиночной игре"
      ariaLabel="Сложность ботов"
      formatValue={(v) => `${v}%`}
      onChange={(v) => onChange(normalizeOfflineBotDifficulty(v))}
    />
  );
}
