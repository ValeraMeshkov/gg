import { memo, type ReactElement } from "react";
import { UI } from "@/constants/uiStrings";
import { MapCatalogSelect } from "@/components/settings/MapCatalogSelect";
import styles from "./MapSideMapPicker.module.scss";

type MapSideMapPickerProps = {
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  /** Заголовок и подсказка вынесены в шапку панели. */
  showTitle?: boolean;
  disabled?: boolean;
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  randomMapLabel?: string;
};

export const MapSideMapPicker = memo(function MapSideMapPicker({
  mapId,
  onMapIdChange,
  mapSelectHint,
  showTitle = true,
  disabled = false,
  randomMapOnStart,
  onRandomMapOnStartChange,
  randomMapLabel = "Случайная карта",
}: MapSideMapPickerProps): ReactElement {
  const showRandom =
    randomMapOnStart != null && onRandomMapOnStartChange != null;

  return (
    <div className={styles.root}>
      {showTitle ? (
        <>
          <p className={styles.title}>{UI.mapSection}</p>
          {mapSelectHint ? (
            <p className={styles.hint}>{mapSelectHint}</p>
          ) : null}
        </>
      ) : null}
      <MapCatalogSelect
        mapId={mapId}
        onMapIdChange={onMapIdChange}
        disabled={disabled}
        showLabel={false}
      />
      {showRandom ? (
        <label
          className={`${styles.randomCheck}${
            disabled ? ` ${styles.randomCheckDisabled}` : ""
          }`}
          title={randomMapLabel}
        >
          <input
            type="checkbox"
            className={styles.randomCheckInput}
            checked={randomMapOnStart}
            disabled={disabled}
            onChange={(e) => onRandomMapOnStartChange(e.target.checked)}
          />
          <span className={styles.randomCheckLabel}>{randomMapLabel}</span>
        </label>
      ) : null}
    </div>
  );
});
