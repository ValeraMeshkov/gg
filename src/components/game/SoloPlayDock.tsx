import type { ReactElement } from "react";
import { inviteHref } from "@/appUrl";
import {
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
} from "@/game/appearance";
import { PlayerAppearanceSelect } from "@/components/settings/PlayerAppearanceSelect";
import {
  RoomDockPlayerList,
  type RoomDockPlayerRow,
} from "@/components/room/RoomDockPlayerList";
import { SoloMapAndBotSettings } from "@/components/settings/SoloMapAndBotSettings";
import { useCenterSelectedBuildingOnSettingsOpen } from "@/hooks/useCenterSelectedBuildingOnSettingsOpen";
import { UI } from "@/constants/uiStrings";
import { MIN_ROOM_PLAYERS } from "@/shared/playerSlots";
import type { RoomStatus } from "@/api/roomApi";
import type { RoomGameOutcome } from "@/game/scoring/types";
import styles from "./SoloPlayDock.module.scss";

export type SoloPlayDockProps = {
  /** solo — оффлайн; roomHost — хост; roomGuest — гость (свой скин, карта только просмотр). */
  variant?: "solo" | "roomHost" | "roomGuest" | "roomWaiting";
  /** В комнате: нельзя менять скин/имя во время активной партии. */
  appearanceLocked?: boolean;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
  onFighterChange: (skin: FighterSkinId) => void;
  onBuildingChange: (skin: BuildingSkinId) => void;
  onDisplayColorChange: (color: DisplayColorId) => void;
  draftDisplayName: string;
  onDraftDisplayNameChange: (value: string) => void;
  onStartGame: () => void;
  gameOutcome: RoomGameOutcome | null;
  awaitingStart: boolean;
  spectating: boolean;
  offlineBotCount?: number;
  onOfflineBotCountChange?: (value: number) => void;
  onOfflineBotCountCommit?: (value: number) => void;
  offlineBotDifficulty?: number;
  onOfflineBotDifficultyChange?: (value: number) => void;
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  randomMapLabel?: string;
  mapCatalogDisabled?: boolean;
  /** Оффлайн: сброс партии, когда главная кнопка не «Начать новую игру». */
  onNewSoloSession?: () => void;
  /** Блокировать кнопку старта (идёт отсчёт). */
  startDisabled?: boolean;
  /** Код комнаты — ссылка на игру в шапке (roomHost). */
  roomCode?: string | null;
  /** Во время партии: «готов к следующей» (очередь / выбыл). */
  showReadyForNext?: boolean;
  readyForNext?: boolean;
  onToggleReadyForNext?: () => void;
  readyForNextBusy?: boolean;
  roomLifecycle?: RoomStatus | null;
  roomDockPlayers?: readonly RoomDockPlayerRow[];
  roomPlayerCount?: number;
  roomMaxPlayers?: number;
  isRoomHost?: boolean;
  onRoomSearch?: () => void;
  onRoomStart?: () => void;
  onRoomLobbyReady?: () => void;
  roomLobbyReady?: boolean;
  canStartMatch?: boolean;
  roomReadyCount?: number;
};

export function SoloPlayDock({
  variant = "solo",
  appearanceLocked = false,
  expanded,
  onExpandedChange,
  fighter,
  building,
  displayColor,
  onFighterChange,
  onBuildingChange,
  onDisplayColorChange,
  draftDisplayName,
  onDraftDisplayNameChange,
  onStartGame,
  gameOutcome,
  awaitingStart,
  spectating,
  offlineBotCount,
  onOfflineBotCountChange,
  onOfflineBotCountCommit,
  offlineBotDifficulty,
  onOfflineBotDifficultyChange,
  mapId,
  onMapIdChange,
  mapSelectHint,
  randomMapOnStart,
  onRandomMapOnStartChange,
  randomMapLabel,
  mapCatalogDisabled = false,
  onNewSoloSession,
  startDisabled = false,
  roomCode = null,
  showReadyForNext = false,
  readyForNext = false,
  onToggleReadyForNext,
  readyForNextBusy = false,
  roomLifecycle = null,
  roomDockPlayers = [],
  roomPlayerCount = 0,
  roomMaxPlayers = 10,
  isRoomHost = false,
  onRoomSearch,
  onRoomStart,
  onRoomLobbyReady,
  roomLobbyReady = false,
  canStartMatch = false,
  roomReadyCount = 0,
}: SoloPlayDockProps): ReactElement {
  useCenterSelectedBuildingOnSettingsOpen(expanded);

  const isRoomHostVariant = variant === "roomHost";
  const isRoomGuest = variant === "roomGuest";
  const isRoomWaiting = variant === "roomWaiting";
  const isRoom = isRoomHostVariant || isRoomGuest || isRoomWaiting;
  const inRoomSetup =
    roomLifecycle === "lobby" || roomLifecycle === "matchmaking";
  const mapLocked = isRoom && !isRoomHostVariant;
  const dockTitle =
    inRoomSetup || !isRoom
      ? UI.soloDockTitle
      : isRoomHostVariant
        ? UI.roomHostDockTitle
        : UI.roomGuestDockTitle;
  const roomInviteUrl = isRoom && roomCode ? inviteHref(roomCode) : "";
  const showBots =
    !isRoom &&
    offlineBotCount != null &&
    onOfflineBotCountChange != null &&
    offlineBotDifficulty != null &&
    onOfflineBotDifficultyChange != null;
  const readyToStart = awaitingStart || gameOutcome != null;
  const statusText =
    gameOutcome != null
      ? null
      : showReadyForNext
        ? readyForNext
          ? UI.roomReadyForNextDone
          : UI.roomReadyForNextHint
        : inRoomSetup && isRoomHost && roomLifecycle === "lobby"
          ? UI.roomLobbyHostHint
          : inRoomSetup && !isRoomHost && roomLifecycle === "lobby"
            ? UI.roomLobbyGuestHint
            : inRoomSetup && isRoomHost && roomLifecycle === "matchmaking"
              ? UI.roomMatchmakingHostHint(roomReadyCount, MIN_ROOM_PLAYERS)
              : inRoomSetup && !isRoomHost && roomLifecycle === "matchmaking"
                ? UI.roomMatchmakingGuestHint
                : isRoomHostVariant && isRoom
              ? UI.roomHostInGameDockHint
              : spectating
            ? UI.soloDockSpectating
            : null;

  if (!expanded) {
    return (
      <div
        className={`${styles.root} ${styles.rootCollapsed}${
          spectating ? ` ${styles.rootSpectating}` : ""
        }`}
      >
        <button
          type="button"
          className={styles.tab}
          onClick={() => onExpandedChange(true)}
          aria-expanded={false}
        >
          {UI.soloDockExpand}
        </button>
      </div>
    );
  }

  const showMapBackdrop = !roomCode;

  return (
    <>
      {showMapBackdrop ? (
        <div className={styles.overlayBackdrop} aria-hidden />
      ) : null}
      <div
        className={`${styles.root}${spectating ? ` ${styles.rootSpectating}` : ""}`}
        role="region"
        aria-label={dockTitle}
      >
      <div className={styles.panel}>
        <div className={styles.head}>
          <div className={styles.headLead}>
            <h2 className={styles.title}>{dockTitle}</h2>
            {roomInviteUrl ? (
              <a
                href={roomInviteUrl}
                className={styles.roomGameLink}
                title={roomInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {UI.roomDockGameLink}
              </a>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={() => onExpandedChange(false)}
            aria-expanded
          >
            {UI.soloDockCollapse}
          </button>
        </div>

        <div className={styles.panelScroll}>
          {statusText ? (
            <p className={styles.statusHint}>{statusText}</p>
          ) : null}

          {isRoom && roomDockPlayers.length > 0 ? (
            <RoomDockPlayerList
              players={roomDockPlayers}
              playerCount={roomPlayerCount}
              maxPlayers={roomMaxPlayers}
              showReady={roomLifecycle === "matchmaking"}
            />
          ) : null}

          <SoloMapAndBotSettings
            mapId={mapId}
            onMapIdChange={onMapIdChange}
            mapSelectHint={mapSelectHint}
            mapCatalogDisabled={mapLocked || mapCatalogDisabled}
            randomMapOnStart={randomMapOnStart}
            onRandomMapOnStartChange={
              mapLocked ? undefined : onRandomMapOnStartChange
            }
            randomMapLabel={randomMapLabel}
            offlineBotCount={offlineBotCount!}
            onOfflineBotCountChange={onOfflineBotCountChange!}
            onOfflineBotCountCommit={onOfflineBotCountCommit}
            offlineBotDifficulty={offlineBotDifficulty!}
            onOfflineBotDifficultyChange={onOfflineBotDifficultyChange!}
            mapBlockClassName={styles.mapBlock}
            botControlsClassName={styles.botsRow}
            botControlClassName={styles.botControl}
            showBotControls={showBots}
          />

          <div className={styles.appearance}>
            {appearanceLocked ? (
              <p className={styles.appearanceLockHint}>
                {UI.appearanceLockedInMatch}
              </p>
            ) : null}
            <PlayerAppearanceSelect
              fighter={fighter}
              building={building}
              displayColor={displayColor}
              onFighterChange={onFighterChange}
              onBuildingChange={onBuildingChange}
              onDisplayColorChange={onDisplayColorChange}
              draftDisplayName={draftDisplayName}
              onDraftDisplayNameChange={onDraftDisplayNameChange}
              appearanceLocked={appearanceLocked}
            />
          </div>

          <div className={styles.hotkeysBlock}>
            <p className={styles.hotkeysTitle}>{UI.mapHotkeysHint}</p>
            <div className={styles.hotkeysRow}>
              <div className={styles.hotkeyBtn} role="note" aria-label={UI.selectAllOwn}>
                <span className={styles.hotkeyKey} aria-hidden>
                  A
                </span>
                <span className={styles.hotkeyLabel}>{UI.selectAllOwn}</span>
              </div>
              <div className={styles.hotkeyBtn} role="note" aria-label={UI.selectTopOwn}>
                <span className={styles.hotkeyKey} aria-hidden>
                  D
                </span>
                <span className={styles.hotkeyLabel}>{UI.selectTopOwn}</span>
              </div>
              <div className={styles.hotkeyBtn} role="note" aria-label={UI.stopFire}>
                <span className={styles.hotkeyKey} aria-hidden>
                  S
                </span>
                <span className={styles.hotkeyLabel}>{UI.stopFire}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.panelFooter}>
          <button
            type="button"
            className={styles.startBtn}
            disabled={
              showReadyForNext
                ? readyForNextBusy
                : inRoomSetup && isRoomHost && roomLifecycle === "matchmaking"
                  ? startDisabled || !canStartMatch
                  : inRoomSetup && !isRoomHost && roomLifecycle === "lobby"
                    ? true
                  : inRoomSetup
                    ? startDisabled
                    : mapLocked || startDisabled
            }
            onClick={() => {
              if (showReadyForNext) {
                onToggleReadyForNext?.();
                return;
              }
              if (inRoomSetup && isRoomHost && roomLifecycle === "lobby") {
                onRoomSearch?.();
                return;
              }
              if (
                inRoomSetup &&
                isRoomHost &&
                roomLifecycle === "matchmaking"
              ) {
                if (!canStartMatch || startDisabled) return;
                onRoomStart?.();
                return;
              }
              if (inRoomSetup && !isRoomHost) {
                onRoomLobbyReady?.();
                return;
              }
              if (
                isRoomHostVariant &&
                roomLifecycle === "playing" &&
                gameOutcome == null
              ) {
                onExpandedChange(false);
                return;
              }
              if (mapLocked || startDisabled) return;
              if (isRoomHostVariant || readyToStart) {
                onStartGame();
              } else if (onNewSoloSession) {
                onNewSoloSession();
              } else {
                onExpandedChange(false);
              }
            }}
          >
            {showReadyForNext
              ? readyForNext
                ? UI.roomReadyForNextCancel
                : UI.roomReadyForNext
              : inRoomSetup && isRoomHost && roomLifecycle === "lobby"
                ? UI.roomSearchGame
                : inRoomSetup && isRoomHost && roomLifecycle === "matchmaking"
                  ? UI.roomPlay
                  : inRoomSetup &&
                      !isRoomHost &&
                      roomLifecycle === "matchmaking"
                    ? roomLobbyReady
                      ? UI.roomReadyCancel
                      : UI.roomReady
                    : inRoomSetup && !isRoomHost && roomLifecycle === "lobby"
                      ? UI.roomGuestDockWaitingHost
                    : isRoomWaiting
                      ? UI.roomWaitingQueue
                      : isRoomGuest
                        ? UI.roomGuestDockWaitingHost
                        : isRoomHostVariant && roomLifecycle === "playing"
                          ? UI.soloDockCollapse
                          : isRoomHostVariant
                            ? UI.roomNextRound
                            : UI.soloDockStartNewGame}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
