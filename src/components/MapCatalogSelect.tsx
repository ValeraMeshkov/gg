import { MAP_CATALOG } from "../game/maps";
import styles from "./MapCatalogSelect.module.scss";

type MapCatalogSelectProps = {
  mapId: string;
  onMapIdChange: (mapId: string) => void;
};

export function MapCatalogSelect({
  mapId,
  onMapIdChange,
}: MapCatalogSelectProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>Карта</span>
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
