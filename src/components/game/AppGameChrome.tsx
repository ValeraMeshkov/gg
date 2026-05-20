import { useCallback, useMemo, useState } from "react";
import { writeAppRoute, inviteHref, type AppRoute } from "@/appUrl";
import { UI } from "@/constants/uiStrings";
import { useAuth } from "@/context/AuthContext";
import { useGameShell } from "@/context/GameShellContext";
import { PlayerShareBar } from "@/components/settings/PlayerShareBar";
import styles from "./AppGameChrome.module.scss";

type AppGameChromeProps = {
  route: AppRoute;
  setRoute: (next: AppRoute) => void;
  onGoToRooms: () => void;
  /** Одиночная игра: показать кнопку «Новая игра» → разворот дока «Перед боем». */
  onNewSoloGame?: () => void;
};

export function AppGameChrome({
  route,
  setRoute,
  onGoToRooms,
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
    roomChromeActions,
    requestExpandSoloBattleDock,
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
      roomList: false,
      roomLobby: false,
      roomWaiting: false,
      roomCode: null,
    };
    setRoute(next);
    writeAppRoute(next);
  }, [route.mapId, setRoute]);

  const showNewGameInHeader =
    Boolean(onNewSoloGame) || (inRoom && roomChromeActions != null);

  const handleNewGameClick = useCallback(() => {
    if (onNewSoloGame) {
      requestExpandSoloBattleDock();
      return;
    }
    void roomChromeActions?.onPrimary();
  }, [onNewSoloGame, roomChromeActions, requestExpandSoloBattleDock]);

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
              <button
                type="button"
                className={styles.roomHeaderBtn}
                onClick={() => void copyRoomInvite()}
              >
                {headerLinkCopied ? UI.linkCopied : UI.linkCopy}
              </button>
            ) : (
              <button
                type="button"
                className={styles.createRoomBtn}
                onClick={() => onGoToRooms()}
              >
                {UI.roomsNav}
              </button>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
