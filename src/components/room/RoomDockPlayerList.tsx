import { UI } from "@/constants/uiStrings";
import styles from "./RoomDockPlayerList.module.scss";

export type RoomDockPlayerRow = {
  userId: string;
  label: string;
  isHost: boolean;
  isYou: boolean;
  ready: boolean;
  inQueue: boolean;
};

type RoomDockPlayerListProps = {
  players: readonly RoomDockPlayerRow[];
  playerCount: number;
  maxPlayers: number;
  showReady: boolean;
};

export function RoomDockPlayerList({
  players,
  playerCount,
  maxPlayers,
  showReady,
}: RoomDockPlayerListProps) {
  return (
    <div className={styles.root}>
      <p className={styles.title}>
        {UI.roomPlayersTitle} {playerCount} / {maxPlayers}
      </p>
      <ul className={styles.list}>
        {players.map((row) => (
          <li key={row.userId} className={styles.item}>
            <span className={styles.name}>{row.label}</span>
            {row.isYou ? (
              <span className={styles.you}> — {UI.roomYou}</span>
            ) : null}
            {row.isHost ? (
              <span className={styles.badge}> ({UI.roomHostBadge})</span>
            ) : null}
            {row.inQueue ? (
              <span className={styles.queue}> · {UI.roomQueueBadge}</span>
            ) : null}
            {showReady && row.ready ? (
              <span className={styles.ready}> ✓ {UI.roomReadyBadge}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
