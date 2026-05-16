import type { CSSProperties } from "react";
import styles from "./PlayerShareBar.module.scss";

export type PlayerShareBarEntry = {
  id: string;
  displayName: string;
  score: number;
  /** Индекс цвета слота (2 — красный, 3 — оранжевый…); одинаковый у всех клиентов. */
  colorIndex: number;
  /** Личный цвет полоски (только у себя); иначе data-player. */
  barBackground?: string;
};

type PlayerShareBarProps = {
  players: readonly PlayerShareBarEntry[];
  activePlayerId: string;
  /** Только показ долей, без переключения игрока. */
  readOnly?: boolean;
  onSelectPlayer?: (playerId: string) => void;
};

export function PlayerShareBar({
  players,
  activePlayerId,
  readOnly = false,
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

        const className = `${styles.segment} ${
          isActive ? styles.segmentActive : ""
        }${readOnly ? ` ${styles.segmentReadOnly}` : ""}`;

        const inner = showScore ? (
          <span className={styles.segmentInner}>
            <span className={styles.segmentLine}>
              <span className={styles.segmentScorePart}>{player.score}</span>
              <span className={styles.segmentDash} aria-hidden>
                -
              </span>
              <span className={styles.segmentParen} aria-hidden></span>
              <span
                className={styles.segmentNameLarge}
                title={player.displayName}
              >
                {player.displayName}
              </span>
              <span className={styles.segmentParen} aria-hidden></span>
            </span>
          </span>
        ) : null;

        const segmentStyle: CSSProperties = {
          flexGrow,
          ...(player.barBackground ? { background: player.barBackground } : {}),
        };
        const dataPlayer = player.barBackground
          ? undefined
          : String(player.colorIndex);

        if (readOnly) {
          return (
            <div
              key={player.id}
              className={className}
              style={segmentStyle}
              data-player={dataPlayer}
              aria-label={`${player.score} очков, ${player.displayName}${
                total > 0 ? `, ${sharePct}%` : ""
              }${isActive ? ", ваш игрок" : ""}`}
              title={`${player.score} - (${player.displayName})`}
            >
              {inner}
            </div>
          );
        }

        return (
          <button
            key={player.id}
            type="button"
            className={className}
            style={segmentStyle}
            data-player={dataPlayer}
            aria-pressed={isActive}
            aria-label={`${player.score} очков, ${player.displayName}${
              total > 0 ? `, ${sharePct}%` : ""
            }`}
            title={`${player.score} - (${player.displayName})`}
            onClick={() => onSelectPlayer?.(player.id)}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
