import { useEffect, useId, useRef, useState } from "react";
import type {
  BuildingSkinId,
  FighterSkinId,
  SkinOption,
} from "../game/appearance";
import { SkinPreviewIcon } from "./map/SkinPreviewIcon";
import styles from "./VisualSkinSelect.module.scss";

type VisualSkinSelectProps<T extends string> = {
  label: string;
  kind: "fighter" | "building";
  value: T;
  options: readonly SkinOption<T>[];
  onChange: (value: T) => void;
};

export function VisualSkinSelect<T extends string>({
  label,
  kind,
  value,
  options,
  onChange,
}: VisualSkinSelectProps<T>) {
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
      <span className={styles.caption}>{label}</span>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <SkinPreviewIcon
          kind={kind}
          skin={value as FighterSkinId | BuildingSkinId}
          size={26}
        />
        <span className={styles.triggerLabel}>{selected.label}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul id={listId} className={styles.menu} role="listbox" aria-label={label}>
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
                  <SkinPreviewIcon
                    kind={kind}
                    skin={opt.id as FighterSkinId | BuildingSkinId}
                    size={30}
                  />
                  <span className={styles.optionLabel}>{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
