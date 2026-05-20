import { useCallback, useEffect, useState } from "react";
import {
  createRoom,
  fetchRoomsList,
  isRoomApiEnabled,
  type RoomListEntry,
} from "@/api/roomApi";
import { gameHref } from "@/appUrl";
import { UI } from "@/constants/uiStrings";
import { getMapCatalogEntry } from "@/game/maps";
import {
  isRoomLobby,
  isRoomMatchmaking,
  isRoomPlaying,
} from "@/shared/roomStatus";
import { useUserId } from "@/hooks/useUserId";
import styles from "./RoomsList.module.scss";

const REFRESH_MS = 4000;

function roomStatusLabel(status: RoomListEntry["status"]): string {
  if (isRoomPlaying(status)) return UI.roomListStatusPlaying;
  if (isRoomMatchmaking(status)) return UI.roomListStatusMatchmaking;
  if (isRoomLobby(status)) return UI.roomListStatusLobby;
  return status;
}

type RoomsListProps = {
  mapId: string;
};

export function RoomsList({ mapId }: RoomsListProps) {
  const userId = useUserId();
  const [rooms, setRooms] = useState<RoomListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!isRoomApiEnabled()) {
      setError(
        import.meta.env.DEV ? UI.serverDevHint : UI.serverNotConfigured
      );
      setRooms([]);
      setLoading(false);
      return;
    }
    try {
      const list = await fetchRoomsList();
      setRooms(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.roomListLoadFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const handleCreate = async () => {
    if (!isRoomApiEnabled()) {
      setError(
        import.meta.env.DEV ? UI.serverDevHint : UI.serverNotConfigured
      );
      return;
    }
    setCreateBusy(true);
    setError(null);
    try {
      const room = await createRoom(userId, mapId);
      window.location.assign(gameHref(room.mapId, room.code));
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.createRoomFailed);
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{UI.roomsTitle}</h1>
      <p className={styles.lead}>{UI.roomsLead}</p>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.btn}
          disabled={createBusy}
          onClick={() => void handleCreate()}
        >
          {createBusy ? UI.creatingRoom : UI.createRoom}
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          disabled={loading}
          onClick={() => void refresh()}
        >
          {UI.roomListRefresh}
        </button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {loading && rooms.length === 0 ? (
        <p className={styles.hint}>{UI.roomListLoading}</p>
      ) : null}

      {!loading && rooms.length === 0 && !error ? (
        <p className={styles.hint}>{UI.roomListEmpty}</p>
      ) : null}

      {rooms.length > 0 ? (
        <ul className={styles.list}>
          {rooms.map((room) => {
            const mapName =
              getMapCatalogEntry(room.mapId)?.name ?? room.mapId;
            return (
              <li key={room.code}>
                <a
                  className={styles.card}
                  href={gameHref(room.mapId, room.code)}
                >
                  <div className={styles.cardHead}>
                    <span className={styles.code}>{room.code}</span>
                    <span className={styles.status}>
                      {roomStatusLabel(room.status)}
                    </span>
                  </div>
                  <p className={styles.meta}>
                    {mapName} · {UI.roomListOnline(room.onlineCount)} ·{" "}
                    {UI.roomListPlayers(room.playerCount, room.maxPlayers)}
                  </p>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      <a className={styles.back} href={gameHref(mapId)}>
        {UI.roomListBackToGame}
      </a>
    </div>
  );
}
