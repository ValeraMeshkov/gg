import { useEffect, useId, useRef, useState } from "react";
import type { DisplayColorId, DisplayColorOption } from "../game/appearance";
import styles from "./DisplayColorSelect.module.scss";

type DisplayColorSelectProps = {
  value: DisplayColorId;
  options: readonly DisplayColorOption[];
  onChange: (value: DisplayColorId) => void;
};

export function DisplayColorSelect({
  value,
  options,
  onChange,
}: DisplayColorSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.id === value) ?? options[0]!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={styles.root}>
      <span className={styles.caption}>Цвет (для себя)</span>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={styles.swatch}
          style={{ background: selected.swatch }}
          aria-hidden
        />
        <span className={styles.triggerLabel}>{selected.label}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul id={listId} className={styles.menu} role="listbox" aria-label="Цвет">
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <li key={opt.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.option}${isSelected ? ` ${styles.optionSelected}` : ""}`}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={styles.swatch}
                    style={{ background: opt.swatch }}
                    aria-hidden
                  />
                  <span>{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
