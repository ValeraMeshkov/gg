import {
  DISPLAY_COLORS,
  normalizeDisplayColor as normalizeDisplayColorShared,
  type DisplayColorId,
} from "@/shared/displayColors";

export type { DisplayColorId };
export { DISPLAY_COLORS };

export type DisplayColorOption = {
  id: DisplayColorId;
  label: string;
  /** Полоска долей и превью в селекторе */
  swatch: string;
};

export const DISPLAY_COLOR_OPTIONS: readonly DisplayColorOption[] = [
  { id: "blue", label: "Синий", swatch: "#4db8ff" },
  { id: "green", label: "Зелёный", swatch: "#5cb87a" },
  { id: "red", label: "Красный", swatch: "#eb5353" },
  { id: "orange", label: "Оранжевый", swatch: "#ff9f70" },
  { id: "violet", label: "Фиолетовый", swatch: "#a978e6" },
  { id: "gold", label: "Золотой", swatch: "#e8b830" },
  { id: "cyan", label: "Бирюзовый", swatch: "#3ec9c6" },
  { id: "pink", label: "Розовый", swatch: "#f472b6" },
] as const;

export function normalizeDisplayColor(v: unknown): DisplayColorId | null {
  return normalizeDisplayColorShared(v);
}

export function displayColorSwatch(id: DisplayColorId): string {
  return (
    DISPLAY_COLOR_OPTIONS.find((o) => o.id === id)?.swatch ?? "#4db8ff"
  );
}
