import { memo, type ReactElement } from "react";
import { UI } from "@/constants/uiStrings";
import { SoloMapAndBotSettings } from "@/components/settings/SoloMapAndBotSettings";
import styles from "@/components/map/styles/MapView.module.scss";

export type MapSideBarPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  mapCatalogDisabled?: boolean;
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  randomMapLabel?: string;
  hideMapPicker?: boolean;
  showSoloControls?: boolean;
  hideSoloControls?: boolean;
  offlineBotCount: number;
  onOfflineBotCountChange: (value: number) => void;
  onOfflineBotCountCommit?: (value: number) => void;
  offlineBotDifficulty: number;
  onOfflineBotDifficultyChange: (value: number) => void;
  hideHotkeys?: boolean;
  mapInteractionLocked?: boolean;
  onSelectAllOwn: () => void;
  onSelectTopOwn: () => void;
  onCancelAimAndPending: () => void;
};

export const MapSideBarPanel = memo(function MapSideBarPanel({
  open,
  onOpenChange,
  mapId,
  onMapIdChange,
  mapSelectHint,
  mapCatalogDisabled = false,
  randomMapOnStart,
  onRandomMapOnStartChange,
  randomMapLabel,
  hideMapPicker = false,
  showSoloControls = false,
  hideSoloControls = false,
  offlineBotCount,
  onOfflineBotCountChange,
  onOfflineBotCountCommit,
  offlineBotDifficulty,
  onOfflineBotDifficultyChange,
  hideHotkeys = false,
  mapInteractionLocked = false,
  onSelectAllOwn,
  onSelectTopOwn,
  onCancelAimAndPending,
}: MapSideBarPanelProps): ReactElement {
  return (
    <div
      className={`${styles.mapSideBar}${open ? "" : ` ${styles.mapSideBarCollapsed}`}`}
      aria-label={UI.mapSidePanel}
    >
      <div className={styles.mapSideBarHeader}>
        {open && !hideMapPicker ? (
          <div className={styles.mapSideBarHeaderText}>
            <p className={styles.mapSideBarSectionTitle}>{UI.mapSection}</p>
            {mapSelectHint ? (
              <p className={styles.mapSideBarSectionHint}>{mapSelectHint}</p>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          className={styles.mapSideBarToggle}
          aria-expanded={open}
          aria-controls="map-side-panel-body"
          title={open ? UI.mapSidePanelCollapse : UI.mapSidePanelExpand}
          aria-label={open ? UI.mapSidePanelCollapse : UI.mapSidePanelExpand}
          onClick={() => onOpenChange(!open)}
        >
          <span className={styles.mapSideBarToggleIcon} aria-hidden>
            {open ? "‹" : "›"}
          </span>
        </button>
      </div>
      {open ? (
        <div id="map-side-panel-body" className={styles.mapSideBarBody}>
          {!hideMapPicker || (showSoloControls && !hideSoloControls) ? (
            <SoloMapAndBotSettings
              mapId={mapId}
              onMapIdChange={onMapIdChange}
              mapSelectHint={mapSelectHint}
              showMapTitle={false}
              showMapPicker={!hideMapPicker}
              mapCatalogDisabled={mapCatalogDisabled}
              randomMapOnStart={randomMapOnStart}
              onRandomMapOnStartChange={onRandomMapOnStartChange}
              randomMapLabel={randomMapLabel}
              offlineBotCount={offlineBotCount}
              onOfflineBotCountChange={onOfflineBotCountChange}
              onOfflineBotCountCommit={onOfflineBotCountCommit}
              offlineBotDifficulty={offlineBotDifficulty}
              onOfflineBotDifficultyChange={onOfflineBotDifficultyChange}
              showBotControls={showSoloControls && !hideSoloControls}
              botControlsClassName={styles.mapSideControls}
              botControlClassName={styles.mapSideControl}
            />
          ) : null}
          {!hideHotkeys ? (
            <div className={styles.mapActionGroup}>
              <p className={styles.mapActionGroupTitle}>{UI.mapHotkeysHint}</p>
              <button
                type="button"
                className={styles.mapActionBtn}
                data-map-action="select-all"
                disabled={mapInteractionLocked}
                title={UI.selectAllOwnTitle}
                aria-label={UI.selectAllOwn}
                onClick={onSelectAllOwn}
              >
                <span className={styles.mapActionKey} aria-hidden>
                  A
                </span>
                <span className={styles.mapActionLabel}>{UI.selectAllOwn}</span>
              </button>
              <button
                type="button"
                className={styles.mapActionBtn}
                data-map-action="select-top"
                disabled={mapInteractionLocked}
                title={UI.selectTopOwnTitle}
                aria-label={UI.selectTopOwn}
                onClick={onSelectTopOwn}
              >
                <span className={styles.mapActionKey} aria-hidden>
                  D
                </span>
                <span className={styles.mapActionLabel}>{UI.selectTopOwn}</span>
              </button>
              <button
                type="button"
                className={styles.mapActionBtn}
                data-map-action="cancel-fire"
                disabled={mapInteractionLocked}
                title={UI.stopFireTitle}
                aria-label={UI.stopFire}
                onClick={onCancelAimAndPending}
              >
                <span className={styles.mapActionKey} aria-hidden>
                  S
                </span>
                <span className={styles.mapActionLabel}>{UI.stopFire}</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
