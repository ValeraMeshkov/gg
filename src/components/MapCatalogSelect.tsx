import { MAP_CATALOG } from "../game/maps";
import styles from "./MapCatalogSelect.module.scss";

type MapCatalogSelectProps = {
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  /** В комнате гость не меняет карту следующей партии. */
  disabled?: boolean;
  /** Подсказка для хоста в комнате: карта следующей партии */
  hint?: string;
  /** Если false — подпись скрыта (например, заголовок секции снаружи). */
  showLabel?: boolean;
};

export function MapCatalogSelect({
  mapId,
  onMapIdChange,
  disabled = false,
  hint,
  showLabel = true,
}: MapCatalogSelectProps) {
  return (
    <label className={styles.field}>
      {showLabel ? (
        <span className={styles.label}>{hint ?? "Карта"}</span>
      ) : null}
      <select
        className={styles.select}
        value={mapId}
        disabled={disabled}
        onChange={(e) => onMapIdChange(e.target.value)}
      >
        {MAP_CATALOG.map((entry) => (
          <option key={entry.id} value={entry.id}>
            №{entry.number} — {entry.name}
          </option>
        ))}
      </select>
    </label>
  );
}
