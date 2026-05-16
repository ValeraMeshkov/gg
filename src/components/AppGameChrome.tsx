import { useCallback, useEffect, useState } from "react";
import { writeAppRoute, inviteHref, type AppRoute } from "../appUrl";
import { useGameShell } from "../context/GameShellContext";
import { OfflineBotCountControl } from "./OfflineBotCountControl";
import { OfflineBotDifficultyControl } from "./OfflineBotDifficultyControl";
import { PlayerShareBar } from "./PlayerShareBar";
import styles from "./AppGameChrome.module.scss";

type AppGameChromeProps = {
  route: AppRoute;
  setRoute: (next: AppRoute) => void;
  createBusy: boolean;
  createError: string | null;
  onCreateRoom: () => void;
  /** Одиночная игра: сброс партии без смены карты. */
  onNewSoloGame?: () => void;
  /** Одиночная игра: сложность ботов в хедере. */
  offlineBotDifficulty?: number;
  onOfflineBotDifficultyChange?: (value: number) => void;
  /** Одиночная игра: число ботов (1–5). */
  offlineBotCount?: number;
  onOfflineBotCountChange?: (value: number) => void;
};

export function AppGameChrome({
  route,
  setRoute,
  createBusy,
  createError,
  onCreateRoom,
  onNewSoloGame,
  offlineBotDifficulty,
  onOfflineBotDifficultyChange,
  offlineBotCount,
  onOfflineBotCountChange,
}: AppGameChromeProps) {
  const inRoom = Boolean(route.roomCode);
  const {
    shareBar,
    settingsOpen,
    setSettingsOpen,
    settingsPanel,
    roomChromeActions,
  } = useGameShell();
  const [headerLinkCopied, setHeaderLinkCopied] = useState(false);

  const copyRoomInvite = useCallback(async () => {
    if (!route.roomCode) return;
    try {
      await navigator.clipboard.writeText(inviteHref(route.roomCode));
      setHeaderLinkCopied(true);
      window.setTimeout(() => setHeaderLinkCopied(false), 2200);
    } catch {
      /* ignore */
    }
  }, [route.roomCode]);

  const goHome = useCallback(() => {
    const next: AppRoute = {
      edit: false,
      mapId: route.mapId,
      roomLobby: false,
      roomWaiting: false,
      roomCode: null,
    };
    setRoute(next);
    writeAppRoute(next);
  }, [route.mapId, setRoute]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, setSettingsOpen]);

  return (
    <div className={styles.chrome}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.homeLink}
              onClick={() => goHome()}
            >
              Home
            </button>
          </div>
          {!inRoom &&
          offlineBotCount != null &&
          onOfflineBotCountChange &&
          offlineBotDifficulty != null &&
          onOfflineBotDifficultyChange ? (
            <div className={styles.headerSoloControls}>
              <OfflineBotCountControl
                className={styles.headerSoloControlItem}
                value={offlineBotCount}
                onChange={onOfflineBotCountChange}
              />
              <OfflineBotDifficultyControl
                className={styles.headerSoloControlItem}
                value={offlineBotDifficulty}
                onChange={onOfflineBotDifficultyChange}
              />
            </div>
          ) : null}
          <div className={styles.headerRight}>
            {inRoom ? (
              <>
                <button
                  type="button"
                  className={styles.roomHeaderBtn}
                  onClick={() => void copyRoomInvite()}
                >
                  {headerLinkCopied ? "Скопировано" : "Ссылка"}
                </button>
                {roomChromeActions ? (
                  <button
                    type="button"
                    className={styles.createRoomBtn}
                    disabled={roomChromeActions.primaryDisabled}
                    onClick={() => roomChromeActions.onPrimary()}
                  >
                    {roomChromeActions.primaryLabel}
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {onNewSoloGame ? (
                  <button
                    type="button"
                    className={styles.newGameBtn}
                    onClick={() => {
                      setSettingsOpen(false);
                      onNewSoloGame();
                    }}
                  >
                    Новая игра
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.createRoomBtn}
                  disabled={createBusy}
                  onClick={() => void onCreateRoom()}
                >
                  {createBusy ? "Создаём…" : "Создать комнату"}
                </button>
              </>
            )}
            <button
              type="button"
              className={styles.settingsBtn}
              onClick={() => setSettingsOpen(true)}
              aria-expanded={settingsOpen}
            >
              Настройки
            </button>
          </div>
        </div>
        {shareBar && shareBar.players.length > 0 ? (
          <div className={styles.shareBarSlot}>
            <PlayerShareBar
              players={shareBar.players}
              activePlayerId={shareBar.activePlayerId}
              readOnly
            />
          </div>
        ) : null}
      </header>
      {!inRoom && createError ? (
        <p className={styles.createRoomError}>{createError}</p>
      ) : null}
      {settingsOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <h2 id="settings-dialog-title" className={styles.modalTitle}>
                Настройки
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setSettingsOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <div className={styles.modalBody}>{settingsPanel}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
