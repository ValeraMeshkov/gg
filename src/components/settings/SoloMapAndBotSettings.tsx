import { memo, type ReactElement } from "react";
import { MapSideMapPicker } from "@/components/map/MapSideMapPicker";
import { OfflineBotCountControl } from "./OfflineBotCountControl";
import { OfflineBotDifficultyControl } from "./OfflineBotDifficultyControl";

export type SoloMapAndBotSettingsProps = {
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  showMapTitle?: boolean;
  mapCatalogDisabled?: boolean;
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  randomMapLabel?: string;
  /** false — только контролы ботов (боковая панель без выбора карты). */
  showMapPicker?: boolean;
  showBotControls?: boolean;
  offlineBotCount: number;
  onOfflineBotCountChange: (value: number) => void;
  onOfflineBotCountCommit?: (value: number) => void;
  offlineBotDifficulty: number;
  onOfflineBotDifficultyChange: (value: number) => void;
  mapBlockClassName?: string;
  botControlsClassName?: string;
  botControlClassName?: string;
};

export const SoloMapAndBotSettings = memo(function SoloMapAndBotSettings({
  mapId,
  onMapIdChange,
  mapSelectHint,
  showMapTitle = true,
  mapCatalogDisabled = false,
  randomMapOnStart,
  onRandomMapOnStartChange,
  randomMapLabel,
  showMapPicker = true,
  showBotControls = true,
  offlineBotCount,
  onOfflineBotCountChange,
  onOfflineBotCountCommit,
  offlineBotDifficulty,
  onOfflineBotDifficultyChange,
  mapBlockClassName,
  botControlsClassName,
  botControlClassName,
}: SoloMapAndBotSettingsProps): ReactElement {
  const showBots = showBotControls;

  return (
    <>
      {showMapPicker ? (
        <div className={mapBlockClassName}>
          <MapSideMapPicker
            mapId={mapId}
            onMapIdChange={onMapIdChange}
            mapSelectHint={mapSelectHint}
            showTitle={showMapTitle}
            disabled={mapCatalogDisabled}
            randomMapOnStart={randomMapOnStart}
            onRandomMapOnStartChange={onRandomMapOnStartChange}
            randomMapLabel={randomMapLabel}
          />
        </div>
      ) : null}
      {showBots ? (
        <div className={botControlsClassName}>
          <OfflineBotCountControl
            className={botControlClassName}
            value={offlineBotCount}
            onChange={onOfflineBotCountChange}
            onCommit={onOfflineBotCountCommit}
          />
          <OfflineBotDifficultyControl
            className={botControlClassName}
            value={offlineBotDifficulty}
            onChange={onOfflineBotDifficultyChange}
          />
        </div>
      ) : null}
    </>
  );
});
