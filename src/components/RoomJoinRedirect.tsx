import { useEffect, useState } from "react";
import { fetchRoom, joinRoom } from "../api/roomApi";
import { gameHref } from "../appUrl";
import { getOrCreateUserId } from "../lib/userId";
import styles from "./RoomPage.module.scss";

type RoomJoinRedirectProps = {
  roomCode: string;
};

/** По ссылке /room/CODE — войти в комнату и сразу открыть поле. */
export function RoomJoinRedirect({ roomCode }: RoomJoinRedirectProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const userId = getOrCreateUserId();

    void (async () => {
      try {
        let room = await fetchRoom(roomCode);
        if (cancelled) return;
        if (!room) {
          setError("Комната не найдена");
          return;
        }
        if (!room.players.some((p) => p.userId === userId)) {
          room = await joinRoom(roomCode, userId);
        }
        if (cancelled) return;
        if (room.status !== "playing") {
          setError("Игра в этой комнате ещё не началась");
          return;
        }
        window.location.assign(gameHref(room.mapId, room.code));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось войти");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Подключение</h1>
      <p className={styles.lead}>Комната {roomCode}</p>
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <p className={styles.hint}>Заходим на карту…</p>
      )}
    </div>
  );
}
