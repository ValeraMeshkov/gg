import { MAP_CATALOG } from "../game/maps";
import styles from "./MapCatalogSelect.module.scss";

type MapCatalogSelectProps = {
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  /** Подсказка для хоста в комнате: карта следующей партии */
  hint?: string;
};

export function MapCatalogSelect({
  mapId,
  onMapIdChange,
  hint,
}: MapCatalogSelectProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{hint ?? "Карта"}</span>
      <select
        className={styles.select}
        value={mapId}
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
