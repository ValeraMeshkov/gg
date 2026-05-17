import {
  OFFLINE_BOT_COUNT,
  normalizeOfflineBotCount,
} from "@/shared/offlineBotCount";
import { HeaderLabeledRange } from "./HeaderLabeledRange";

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
    <HeaderLabeledRange
      className={className}
      label="Соперники"
      value={normalized}
      min={OFFLINE_BOT_COUNT.min}
      max={OFFLINE_BOT_COUNT.max}
      step={1}
      title="Сколько соперников-ботов в одиночной игре"
      ariaLabel="Количество соперников"
      formatValue={(v) => String(v)}
      onChange={(v) => onChange(normalizeOfflineBotCount(v))}
    />
  );
}
