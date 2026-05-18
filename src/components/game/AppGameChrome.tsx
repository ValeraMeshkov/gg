import { useCallback, useEffect, useMemo, useState } from "react";
import { useCenterSelectedBuildingOnSettingsOpen } from "@/components/settings/useCenterSelectedBuildingOnSettingsOpen";
import { writeAppRoute, inviteHref, type AppRoute } from "@/appUrl";
import { UI } from "@/constants/uiStrings";
import { useAuth } from "@/context/AuthContext";
import { useGameShell } from "@/context/GameShellContext";
import { PlayerShareBar } from "@/components/settings/PlayerShareBar";
import styles from "./AppGameChrome.module.scss";

type AppGameChromeProps = {
  route: AppRoute;
  setRoute: (next: AppRoute) => void;
  createBusy: boolean;
  createError: string | null;
  onCreateRoom: () => void;
  /** Одиночная игра: сброс партии без смены карты. */
  onNewSoloGame?: () => void;
};

export function AppGameChrome({
  route,
  setRoute,
  createBusy,
  createError,
  onCreateRoom,
  onNewSoloGame,
}: AppGameChromeProps) {
  const inRoom = Boolean(route.roomCode);
  const {
    showGoogleSignIn,
    isAuthenticated,
    user,
    signInWithGoogle,
  } = useAuth();
  const userLabel = useMemo(() => {
    const email = user?.email?.trim();
    if (!email) return null;
    const at = email.indexOf("@");
    return at > 0 ? email.slice(0, at) : email;
  }, [user?.email]);
  const {
    shareBar,
    settingsOpen,
    setSettingsOpen,
    settingsPanel,
    roomChromeActions,
  } = useGameShell();
  const [headerLinkCopied, setHeaderLinkCopied] = useState(false);
  const [settingsLayerMounted, setSettingsLayerMounted] = useState(false);

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
    if (settingsOpen) setSettingsLayerMounted(true);
  }, [settingsOpen]);

  useCenterSelectedBuildingOnSettingsOpen(settingsOpen);

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

  const showNewGameInHeader =
    Boolean(onNewSoloGame) || (inRoom && roomChromeActions != null);

  const handleNewGameClick = useCallback(() => {
    setSettingsOpen(false);
    if (onNewSoloGame) {
      onNewSoloGame();
      return;
    }
    void roomChromeActions?.onPrimary();
  }, [onNewSoloGame, roomChromeActions, setSettingsOpen]);

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
            {showNewGameInHeader ? (
              <button
                type="button"
                className={styles.newGameBtn}
                disabled={
                  inRoom ? roomChromeActions?.primaryDisabled : false
                }
                onClick={() => void handleNewGameClick()}
              >
                {UI.newGame}
              </button>
            ) : null}
            {showGoogleSignIn ? (
              <button
                type="button"
                className={styles.googleBtn}
                onClick={() => signInWithGoogle()}
              >
                Войти через Google
              </button>
            ) : null}
            {isAuthenticated && userLabel ? (
              <span className={styles.userBadge} title={user?.email ?? undefined}>
                {userLabel}
              </span>
            ) : null}
          </div>
          {shareBar && shareBar.players.length > 0 ? (
            <div className={styles.headerShareBar}>
              <PlayerShareBar
                players={shareBar.players}
                activePlayerId={shareBar.activePlayerId}
                readOnly
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
                  {headerLinkCopied ? UI.linkCopied : UI.linkCopy}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.createRoomBtn}
                disabled={createBusy}
                onClick={() => void onCreateRoom()}
              >
                {createBusy ? UI.creatingRoom : UI.createRoom}
              </button>
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
      </header>
      {!inRoom && createError ? (
        <p className={styles.createRoomError}>{createError}</p>
      ) : null}
      {settingsPanel && (settingsOpen || settingsLayerMounted) ? (
        <div
          className={`${styles.modalBackdrop}${
            settingsOpen ? "" : ` ${styles.modalBackdropHidden}`
          }`}
          role="presentation"
          aria-hidden={!settingsOpen}
          onClick={settingsOpen ? () => setSettingsOpen(false) : undefined}
        >
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal={settingsOpen ? true : undefined}
            aria-hidden={!settingsOpen}
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
                tabIndex={settingsOpen ? 0 : -1}
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
