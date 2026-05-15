import { useCallback, useEffect, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { MapCatalogSelect } from "./components/MapCatalogSelect";
import { MapDotEditor } from "./components/MapDotEditor";
import { RoomLobby } from "./components/RoomLobby";
import { RoomWaiting } from "./components/RoomWaiting";
import { readAppRoute, roomLobbyHref, writeAppRoute } from "./appUrl";
import styles from "./App.module.scss";

function App() {
  const [route, setRoute] = useState(readAppRoute);

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
          <RoomWaiting roomCode={route.roomCode} />
        </main>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <MapCatalogSelect mapId={route.mapId} onMapIdChange={setMapId} />
        <a className={styles.roomLink} href={roomLobbyHref()}>
          Вдвоём
        </a>
      </header>
      <main className={styles.main}>
        <GameCanvas
          key={`${route.mapId}-${route.roomCode ?? "solo"}`}
          mapId={route.mapId}
          roomCode={route.roomCode}
        />
      </main>
    </div>
  );
}

export default App;
