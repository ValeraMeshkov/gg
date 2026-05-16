import { useCallback, useEffect, useState } from "react";
import { createRoom, isRoomApiEnabled } from "./api/roomApi";
import { AppGameChrome } from "./components/AppGameChrome";
import { GameCanvas } from "./components/GameCanvas";
import { MapDotEditor } from "./components/MapDotEditor";
import { RoomJoinRedirect } from "./components/RoomJoinRedirect";
import { RoomLobby } from "./components/RoomLobby";
import { GameShellProvider } from "./context/GameShellContext";
import { readAppRoute, writeAppRoute, gameHref, type AppRoute } from "./appUrl";
import { pickRandomCatalogMapId } from "./game/maps";
import {
  readOfflineBotCount,
  writeOfflineBotCount,
} from "./lib/offlineBotCountStorage";
import {
  readOfflineBotDifficulty,
  writeOfflineBotDifficulty,
} from "./lib/offlineBotDifficultyStorage";
import {
  readRandomMapOnStart,
  writeRandomMapOnStart,
} from "./lib/randomMapOnStart";
import { getOrCreateUserId } from "./lib/userId";
import styles from "./App.module.scss";

function isSoloPlayRoute(r: AppRoute): boolean {
  return !r.edit && !r.roomLobby && !r.roomWaiting && !r.roomCode;
}

function initialRoute(): AppRoute {
  const base = readAppRoute();
  if (isSoloPlayRoute(base) && readRandomMapOnStart()) {
    return { ...base, mapId: pickRandomCatalogMapId(base.mapId) };
  }
  return base;
}

function App() {
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [soloSessionKey, setSoloSessionKey] = useState(0);
  const [randomMapOnStart, setRandomMapOnStart] = useState(readRandomMapOnStart);
  const [offlineBotDifficulty, setOfflineBotDifficulty] = useState(
    readOfflineBotDifficulty
  );
  const [offlineBotCount, setOfflineBotCount] = useState(readOfflineBotCount);

  useEffect(() => {
    const onPopState = () => setRoute(readAppRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setMapId = useCallback(
    (mapId: string) => {
      const next = { ...route, mapId };
      setRoute(next);
      writeAppRoute(next);
    },
    [route],
  );

  const setEditorMapId = useCallback((mapId: string) => {
    setRoute((prev) => {
      const next = { ...prev, mapId };
      writeAppRoute(next);
      return next;
    });
  }, []);

  const bumpSoloSession = useCallback(() => {
    setRoute((prev) => {
      if (!isSoloPlayRoute(prev) || !readRandomMapOnStart()) {
        return prev;
      }
      const mapId = pickRandomCatalogMapId(prev.mapId);
      const next = { ...prev, mapId };
      writeAppRoute(next);
      return next;
    });
    setSoloSessionKey((k) => k + 1);
  }, []);

  const handleRandomMapOnStartChange = useCallback((v: boolean) => {
    setRandomMapOnStart(v);
    writeRandomMapOnStart(v);
  }, []);

  const handleOfflineBotDifficultyChange = useCallback((v: number) => {
    setOfflineBotDifficulty(v);
    writeOfflineBotDifficulty(v);
  }, []);

  const handleOfflineBotCountChange = useCallback((v: number) => {
    setOfflineBotCount(v);
    writeOfflineBotCount(v);
    setSoloSessionKey((k) => k + 1);
  }, []);

  const handleCreateRoom = useCallback(async () => {
    if (!isRoomApiEnabled()) {
      setCreateError(
        import.meta.env.DEV
          ? "Запустите сервер: npm run dev:server"
          : "Сервер не настроен (api-config.json)"
      );
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const room = await createRoom(getOrCreateUserId(), route.mapId);
      window.location.assign(gameHref(room.mapId, room.code));
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Не удалось создать комнату"
      );
    } finally {
      setCreateBusy(false);
    }
  }, [route.mapId]);

  if (route.edit) {
    return (
      <div className={styles.app}>
        <main className={styles.main}>
          <MapDotEditor mapId={route.mapId} onMapIdChange={setEditorMapId} />
        </main>
      </div>
    );
  }

  if (route.roomLobby) {
    return (
      <div className={styles.app}>
        <main className={styles.main}>
          <RoomLobby mapId={route.mapId} />
        </main>
      </div>
    );
  }

  if (route.roomWaiting && route.roomCode) {
    return (
      <div className={styles.app}>
        <main className={styles.main}>
          <RoomJoinRedirect roomCode={route.roomCode} />
        </main>
      </div>
    );
  }

  return (
    <GameShellProvider>
      <div className={styles.app}>
        <AppGameChrome
          route={route}
          setRoute={setRoute}
          createBusy={createBusy}
          createError={createError}
          onCreateRoom={handleCreateRoom}
          onNewSoloGame={route.roomCode ? undefined : bumpSoloSession}
          offlineBotDifficulty={
            route.roomCode ? undefined : offlineBotDifficulty
          }
          onOfflineBotDifficultyChange={
            route.roomCode ? undefined : handleOfflineBotDifficultyChange
          }
          offlineBotCount={route.roomCode ? undefined : offlineBotCount}
          onOfflineBotCountChange={
            route.roomCode ? undefined : handleOfflineBotCountChange
          }
        />
        <main className={styles.main}>
          <GameCanvas
            key={
              route.roomCode
                ? `room-${route.roomCode}`
                : `solo-${route.mapId}-${soloSessionKey}-${offlineBotCount}`
            }
            mapId={route.mapId}
            roomCode={route.roomCode}
            onMapIdChange={setMapId}
            mapSelectHint={
              route.roomCode ? "Карта (новая партия)" : undefined
            }
            randomMapOnStart={
              route.roomCode ? undefined : randomMapOnStart
            }
            onRandomMapOnStartChange={
              route.roomCode ? undefined : handleRandomMapOnStartChange
            }
            offlineBotDifficulty={
              route.roomCode ? undefined : offlineBotDifficulty
            }
            offlineBotCount={route.roomCode ? undefined : offlineBotCount}
            onOfflineNewGame={route.roomCode ? undefined : bumpSoloSession}
          />
        </main>
      </div>
    </GameShellProvider>
  );
}

export default App;
