import { useCallback, useEffect, useState } from "react";
import {
  fetchRoom,
  joinRoom,
  startRoom,
  type Room,
} from "@/api/roomApi";
import { gameHref, roomHref, roomLobbyHref } from "@/appUrl";
import { useUserId } from "@/hooks/useUserId";
import styles from "./RoomPage.module.scss";

type RoomWaitingProps = {
  roomCode: string;
};

export function RoomWaiting({ roomCode }: RoomWaitingProps) {
  const userId = useUserId();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      let r = await fetchRoom(roomCode);
      if (!r) {
        setError("Комната не найдена");
        return;
      }
      if (!r.players.some((p) => p.userId === userId)) {
        r = await joinRoom(roomCode, userId);
      }
      setRoom(r);
      setError(null);

      if (r.status === "playing") {
        window.location.assign(gameHref(r.mapId, r.code));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    }
  }, [roomCode, userId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${roomHref(roomCode)}`
      : "";

  const isHost = room?.hostUserId === userId;
  const canStart =
    isHost && room?.status === "lobby" && (room?.players.length ?? 0) >= 2;

  const handleStart = async () => {
    setBusy(true);
    try {
      const r = await startRoom(roomCode, userId);
      window.location.assign(gameHref(r.mapId, r.code));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось начать");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}`
        : inviteUrl;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Комната</h1>
      <p className={styles.code}>{roomCode}</p>

      {room ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Игроки {room.players.length} / {room.maxPlayers}
          </h2>
          <ul className={styles.players}>
            {room.players.map((p, i) => (
              <li key={p.userId}>
                Игрок {i + 1}
                {p.userId === userId ? (
                  <span className={styles.you}> — вы</span>
                ) : null}
                {p.userId === room.hostUserId ? " (хост)" : null}
              </li>
            ))}
          </ul>
          {canStart ? (
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => void handleStart()}
              style={{ marginTop: 12 }}
            >
              Начать игру
            </button>
          ) : (
            <p className={styles.hint}>
              {isHost
                ? "Дождитесь второго игрока по ссылке ниже."
                : "Ждём, пока хост начнёт игру…"}
            </p>
          )}
          <p className={styles.linkRow}>
            Ссылка для друга:{" "}
            <button type="button" className={styles.btnSecondary} onClick={() => void copyLink()}>
              Скопировать
            </button>
          </p>
        </section>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <a className={styles.back} href={roomLobbyHref()}>
        ← Другая комната
      </a>
    </div>
  );
}
