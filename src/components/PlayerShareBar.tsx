import styles from "./PlayerShareBar.module.scss";

export type PlayerShareBarEntry = {
  id: string;
  displayName: string;
  score: number;
  /** 1-based индекс для цвета (1 — синий, 2 — коралловый, 3 — зелёный). */
  colorIndex: number;
};

type PlayerShareBarProps = {
  players: readonly PlayerShareBarEntry[];
  activePlayerId: string;
  onSelectPlayer: (playerId: string) => void;
};

export function PlayerShareBar({
  players,
  activePlayerId,
  onSelectPlayer,
}: PlayerShareBarProps) {
  const alive = players.filter((p) => p.score > 0);
  const total = alive.reduce((sum, p) => sum + p.score, 0);

  if (alive.length === 0) {
    return (
      <div
        className={styles.bar}
        role="group"
        aria-label="Доля игроков"
        aria-hidden
      />
    );
  }

  return (
    <div
      className={styles.bar}
      role="group"
      aria-label="Доля игроков и выбор под управлением"
    >
      {alive.map((player) => {
        const isActive = player.id === activePlayerId;
        const flexGrow = player.score;
        const sharePct =
          total > 0 ? Math.round((player.score / total) * 100) : 0;
        const showScore =
          total <= 0 || (total > 0 && player.score / total >= 0.08);

        return (
          <button
            key={player.id}
            type="button"
            className={`${styles.segment} ${
              isActive ? styles.segmentActive : ""
            }`}
            style={{ flexGrow }}
            data-player={String(player.colorIndex)}
            aria-pressed={isActive}
            aria-label={`${player.displayName}, ${player.score} очков${
              total > 0 ? `, ${sharePct}%` : ""
            }`}
            title={`${player.displayName}: ${player.score}`}
            onClick={() => onSelectPlayer(player.id)}
          >
            {showScore ? (
              <span className={styles.segmentScore}>{player.score}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
