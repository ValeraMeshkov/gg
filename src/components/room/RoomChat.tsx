import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { DisplayColorId, PlayerAppearancesMap } from "@/game/appearance";
import { chatAuthorColor } from "@/game/playerColors";
import styles from "./RoomChat.module.scss";

export type RoomChatLine = {
  key: string;
  slotId: string;
  name: string;
  text: string;
  sentAt: number;
};

type RoomChatProps = {
  lines: readonly RoomChatLine[];
  connected: boolean;
  localPlayerId: string;
  appearances: PlayerAppearancesMap;
  localDisplayColor: DisplayColorId;
  onSend: (text: string) => void;
};

const MAX_INPUT = 200;

export function RoomChat({
  lines,
  connected,
  localPlayerId,
  appearances,
  localDisplayColor,
  onSend,
}: RoomChatProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const readUpToRef = useRef(0);
  const prevLenRef = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    const prevLen = prevLenRef.current;
    const newLen = lines.length;
    if (newLen === 0) {
      prevLenRef.current = 0;
      readUpToRef.current = 0;
      setUnreadCount(0);
      return;
    }
    prevLenRef.current = newLen;
    if (newLen < readUpToRef.current) {
      readUpToRef.current = newLen;
    }
    if (inputFocused) {
      readUpToRef.current = newLen;
      setUnreadCount(0);
      return;
    }
    const bulkAdded = newLen - prevLen > 1;
    if (bulkAdded) {
      readUpToRef.current = newLen;
      setUnreadCount(0);
      return;
    }
    setUnreadCount(Math.max(0, newLen - readUpToRef.current));
  }, [lines, inputFocused]);

  useLayoutEffect(() => {
    if (!inputFocused) return;
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 48;
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    if (maxScroll - el.scrollTop < threshold) {
      el.scrollTop = maxScroll;
    }
  }, [lines, inputFocused]);

  const submit = useCallback(() => {
    const t = draft.trim();
    if (!t || !connected) return;
    onSend(t.slice(0, MAX_INPUT));
    setDraft("");
  }, [draft, connected, onSend]);

  const showUnread = unreadCount > 0 && !inputFocused;

  return (
    <div className={styles.wrap} aria-label="Чат комнаты">
      <div
        ref={scrollRef}
        className={`${styles.messages} ${inputFocused ? styles.messagesOpen : styles.messagesCollapsed}`}
        role="log"
        aria-live="polite"
        aria-hidden={!inputFocused}
      >
        {lines.length > 1 ? (
          <div className={styles.messagesFlexPad} aria-hidden />
        ) : null}
        {lines.map((line) => (
          <p key={line.key} className={styles.line}>
            <span
              className={styles.author}
              style={{
                color: chatAuthorColor(
                  line.slotId,
                  localPlayerId,
                  appearances,
                  localDisplayColor
                ),
              }}
            >
              {line.name}
            </span>
            <span className={styles.text}>{line.text}</span>
          </p>
        ))}
      </div>
      <div className={styles.inputRow}>
        {showUnread ? (
          <span
            className={styles.unreadBadge}
            aria-label={`Непрочитанных сообщений: ${unreadCount}`}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <label htmlFor={inputId} className={styles.srOnly}>
          Сообщение
        </label>
        <input
          id={inputId}
          type="text"
          className={`${styles.input} ${showUnread ? styles.inputUnread : ""}`}
          value={draft}
          maxLength={MAX_INPUT}
          placeholder={connected ? "Сообщение…" : "Нет связи…"}
          disabled={!connected}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_INPUT))}
          onFocus={() => {
            setInputFocused(true);
            readUpToRef.current = lines.length;
            setUnreadCount(0);
            requestAnimationFrame(() => {
              const el = scrollRef.current;
              if (!el) return;
              el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
            });
          }}
          onBlur={() => setInputFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>
    </div>
  );
}
