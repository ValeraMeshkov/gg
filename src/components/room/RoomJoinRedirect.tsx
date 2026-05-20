import { useEffect, useState } from "react";
import { fetchRoom, joinRoom } from "@/api/roomApi";
import { gameHref } from "@/appUrl";
import { UI } from "@/constants/uiStrings";
import { DEFAULT_MAP_ID } from "@/game/maps";
import { useUserId } from "@/hooks/useUserId";
import styles from "./RoomPage.module.scss";

type RoomJoinRedirectProps = {
  roomCode: string;
};

/** По ссылке /room/CODE — войти и открыть поле с настройками. */
export function RoomJoinRedirect({ roomCode }: RoomJoinRedirectProps) {
  const userId = useUserId();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        let room = await fetchRoom(roomCode);
        if (cancelled) return;
        if (!room) {
          window.location.replace(gameHref(DEFAULT_MAP_ID));
          return;
        }
        if (!room.players.some((p) => p.userId === userId)) {
          room = await joinRoom(roomCode, userId);
        }
        if (cancelled) return;
        window.location.assign(gameHref(room.mapId, room.code));
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("не найдена") || msg.includes("404")) {
          window.location.replace(gameHref(DEFAULT_MAP_ID));
          return;
        }
        setError(msg || UI.roomJoinFailed);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode, userId]);

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{UI.roomJoinTitle}</h1>
      <p className={styles.lead}>{UI.roomJoinLead(roomCode)}</p>
      {error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <p className={styles.hint}>{UI.roomJoinHint}</p>
      )}
    </div>
  );
}
