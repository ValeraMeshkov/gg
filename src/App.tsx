import { useCallback, useEffect, useState } from "react";
import { createRoom, isRoomApiEnabled } from "./api/roomApi";
import { GameCanvas } from "./components/GameCanvas";
import { MapCatalogSelect } from "./components/MapCatalogSelect";
import { MapDotEditor } from "./components/MapDotEditor";
import { RoomJoinRedirect } from "./components/RoomJoinRedirect";
import { RoomLobby } from "./components/RoomLobby";
import { readAppRoute, writeAppRoute, gameHref } from "./appUrl";
import { getOrCreateUserId } from "./lib/userId";
import styles from "./App.module.scss";

function App() {
  const [route, setRoute] = useState(readAppRoute);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
      setCreateError(e instanceof Error ? e.message : "Не удалось создать комнату");
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
    <div className={styles.app}>
      <header className={styles.header}>
        <MapCatalogSelect
          mapId={route.mapId}
          onMapIdChange={setMapId}
          hint={route.roomCode ? "Карта (новая партия)" : undefined}
        />
        {!route.roomCode ? (
          <button
            type="button"
            className={styles.createRoomBtn}
            disabled={createBusy}
            onClick={() => void handleCreateRoom()}
          >
            {createBusy ? "Создаём…" : "Создать комнату"}
          </button>
        ) : null}
      </header>
      {createError ? (
        <p className={styles.createRoomError}>{createError}</p>
      ) : null}
      <main className={styles.main}>
        <GameCanvas
          key={route.roomCode ? `room-${route.roomCode}` : `solo-${route.mapId}`}
          mapId={route.mapId}
          roomCode={route.roomCode}
        />
      </main>
    </div>
  );
}

export default App;
