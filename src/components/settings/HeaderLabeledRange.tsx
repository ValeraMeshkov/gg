import styles from "./HeaderLabeledRange.module.scss";

export type HeaderLabeledRangeProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** После отпускания ползунка (для тяжёлых действий вроде рестарта партии). */
  onCommit?: (value: number) => void;
  formatValue?: (value: number) => string;
  ariaLabel: string;
  title?: string;
  className?: string;
  wide?: boolean;
};

export function HeaderLabeledRange({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  formatValue = (v) => String(v),
  ariaLabel,
  title,
  className,
  wide = false,
}: HeaderLabeledRangeProps) {
  const valueText = formatValue(value);

  return (
    <label
      className={[styles.root, wide ? styles.rootWide : "", className]
        .filter(Boolean)
        .join(" ")}
      title={title ?? `${label}: ${valueText}`}
    >
      <span className={styles.captionRow}>
        <span className={styles.labelName}>{label}</span>
        <span className={styles.labelValue}>{valueText}</span>
      </span>
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        onInput={(e) => onChange(Number(e.currentTarget.value))}
        onPointerUp={(e) => {
          const el = e.currentTarget;
          onCommit?.(Number(el.value));
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onCommit?.(Number(e.currentTarget.value));
          }
        }}
      />
    </label>
  );
}
