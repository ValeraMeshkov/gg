import type { ReactElement } from "react";
import { createPortal } from "react-dom";
import { UI } from "@/constants/uiStrings";
import type { RoomGameOutcome } from "@/game/scoring/types";
import { isMatchWon } from "@/shared/matchOutcome";
import styles from "./MatchOutcomeModal.module.scss";

export type MatchOutcomeModalProps = {
  outcome: RoomGameOutcome;
  onDismiss: () => void;
  onSoloNewGame?: () => void;
  soloStartDisabled?: boolean;
  roomCode?: string | null;
  roomIsHost?: boolean;
  roomBusy?: boolean;
  onRoomNewGame?: () => void;
  showReadyForNext?: boolean;
  readyForNext?: boolean;
  readyForNextBusy?: boolean;
  onReadyForNext?: () => void;
};

function outcomeCopy(outcome: RoomGameOutcome): {
  eyebrow: string;
  headline: string;
  subtitle: string;
  icon: string;
} {
  if (isMatchWon(outcome)) {
    return {
      eyebrow: UI.outcomeModalEyebrowWon,
      headline: UI.outcomeWon,
      subtitle: UI.outcomeModalSubtitleWon,
      icon: "★",
    };
  }
  return {
    eyebrow: UI.outcomeModalEyebrowLost,
    headline: UI.outcomeLost,
    subtitle: UI.outcomeModalSubtitleLost,
    icon: "×",
  };
}

export function MatchOutcomeModal({
  outcome,
  onDismiss,
  onSoloNewGame,
  soloStartDisabled = false,
  roomCode = null,
  roomIsHost = false,
  roomBusy = false,
  onRoomNewGame,
  showReadyForNext = false,
  readyForNext = false,
  readyForNextBusy = false,
  onReadyForNext,
}: MatchOutcomeModalProps): ReactElement {
  const copy = outcomeCopy(outcome);

  const showSoloNew =
    !roomCode && Boolean(onSoloNewGame);
  const showRoomHost = Boolean(roomCode && roomIsHost && onRoomNewGame);
  const showRoomGuest =
    Boolean(roomCode && !roomIsHost) && !showReadyForNext;
  const showReadyNext =
    Boolean(roomCode && showReadyForNext && onReadyForNext);

  return createPortal(
    <div
      className={styles.backdrop}
      data-outcome={outcome}
      role="presentation"
      onClick={onDismiss}
    >
      <div
        className={styles.modal}
        data-outcome={outcome}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-outcome-title"
        aria-describedby="match-outcome-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.glow} aria-hidden />
        <button
          type="button"
          className={styles.close}
          aria-label={UI.dismiss}
          onClick={onDismiss}
        >
          ×
        </button>
        <div className={styles.top}>
          <div className={styles.iconBadge} aria-hidden>
            {copy.icon}
          </div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
        </div>
        <div className={styles.body}>
          <h2 id="match-outcome-title" className={styles.headline}>
            {copy.headline}
          </h2>
          <p id="match-outcome-desc" className={styles.subtitle}>
            {showReadyForNext && !roomIsHost
              ? UI.outcomeModalSubtitleEliminated
              : showRoomHost
                ? UI.outcomeModalSubtitleHostNextRound
                : showRoomGuest
                  ? UI.outcomeModalSubtitleGuest
                  : copy.subtitle}
          </p>
        </div>
        <div className={styles.actions}>
          {showSoloNew ? (
            <button
              type="button"
              className={styles.primary}
              disabled={soloStartDisabled}
              onClick={onSoloNewGame}
            >
              {UI.outcomeModalNewGame}
            </button>
          ) : null}
          {showRoomHost ? (
            <button
              type="button"
              className={styles.primary}
              disabled={roomBusy}
              onClick={onRoomNewGame}
            >
              {UI.outcomeModalHostNextRound}
            </button>
          ) : null}
          {showReadyNext ? (
            <button
              type="button"
              className={styles.primary}
              disabled={readyForNextBusy}
              onClick={onReadyForNext}
            >
              {readyForNext
                ? UI.roomReadyForNextCancel
                : UI.outcomeModalReadyNext}
            </button>
          ) : null}
          {showRoomGuest ? (
            <div className={styles.guestBox}>
              <p className={styles.guestLead}>{UI.waitingHost}</p>
            </div>
          ) : null}
          <button type="button" className={styles.secondary} onClick={onDismiss}>
            {UI.dismiss}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
