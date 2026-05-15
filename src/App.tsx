import { useCallback, useEffect, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { MapCatalogSelect } from "./components/MapCatalogSelect";
import { readAppRoute, writeAppRoute } from "./appUrl";
import { getMapCatalogEntry } from "./game/maps";
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

  const catalog = getMapCatalogEntry(route.mapId);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Territory</h1>
        <div className={styles.mapPicker}>
          <MapCatalogSelect mapId={route.mapId} onMapIdChange={setMapId} />
        </div>
        {catalog ? (
          <p className={styles.sub}>
            Карта №{catalog.number}: {catalog.name}
          </p>
        ) : null}
      </header>
      <main className={styles.main}>
        <GameCanvas key={route.mapId} mapId={route.mapId} />
      </main>
    </div>
  );
}

export default App;
