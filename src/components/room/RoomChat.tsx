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

type PreviewToast = {
  id: string;
  line: RoomChatLine;
  hiding: boolean;
};

const MAX_INPUT = 200;
const PREVIEW_VISIBLE_MS = 3_000;
const PREVIEW_FADE_MS = 320;
const MAX_PREVIEW_STACK = 8;

function isHistoryLineKey(key: string): boolean {
  return key.startsWith("hist-");
}

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
  const knownKeysRef = useRef<Set<string>>(new Set());
  const readKeysRef = useRef<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const [previewToasts, setPreviewToasts] = useState<readonly PreviewToast[]>([]);
  const previewTimersRef = useRef(
    new Map<string, { hide: number; clear: number }>()
  );

  const clearPreviewTimer = useCallback((id: string) => {
    const timers = previewTimersRef.current.get(id);
    if (!timers) return;
    window.clearTimeout(timers.hide);
    window.clearTimeout(timers.clear);
    previewTimersRef.current.delete(id);
  }, []);

  const clearAllPreviewTimers = useCallback(() => {
    for (const id of previewTimersRef.current.keys()) {
      clearPreviewTimer(id);
    }
  }, [clearPreviewTimer]);

  const dismissAllPreviews = useCallback(() => {
    clearAllPreviewTimers();
    setPreviewToasts([]);
  }, [clearAllPreviewTimers]);

  const schedulePreviewRemoval = useCallback(
    (id: string) => {
      clearPreviewTimer(id);
      const hide = window.setTimeout(() => {
        setPreviewToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, hiding: true } : t))
        );
        const clear = window.setTimeout(() => {
          setPreviewToasts((prev) => prev.filter((t) => t.id !== id));
          previewTimersRef.current.delete(id);
        }, PREVIEW_FADE_MS);
        previewTimersRef.current.set(id, { hide: 0, clear });
      }, PREVIEW_VISIBLE_MS);
      previewTimersRef.current.set(id, { hide, clear: 0 });
    },
    [clearPreviewTimer]
  );

  const pushPreview = useCallback(
    (line: RoomChatLine) => {
      const id = line.key;
      setPreviewToasts((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        const next: PreviewToast[] = [...prev, { id, line, hiding: false }];
        if (next.length > MAX_PREVIEW_STACK) {
          const dropped = next.shift();
          if (dropped) clearPreviewTimer(dropped.id);
        }
        return next;
      });
      schedulePreviewRemoval(id);
    },
    [clearPreviewTimer, schedulePreviewRemoval]
  );

  const markAllRead = useCallback(() => {
    for (const line of lines) {
      readKeysRef.current.add(line.key);
    }
    setUnreadCount(0);
  }, [lines]);

  const recomputeUnread = useCallback(() => {
    let n = 0;
    for (const line of lines) {
      if (line.slotId === localPlayerId) continue;
      if (!readKeysRef.current.has(line.key)) n += 1;
    }
    setUnreadCount(n);
  }, [lines, localPlayerId]);

  useEffect(() => () => clearAllPreviewTimers(), [clearAllPreviewTimers]);

  useEffect(() => {
    const liveKeys = new Set(lines.map((l) => l.key));
    for (const key of knownKeysRef.current) {
      if (!liveKeys.has(key)) knownKeysRef.current.delete(key);
    }
    for (const key of readKeysRef.current) {
      if (!liveKeys.has(key)) readKeysRef.current.delete(key);
    }

    if (lines.length === 0) {
      knownKeysRef.current.clear();
      readKeysRef.current.clear();
      setUnreadCount(0);
      dismissAllPreviews();
      return;
    }

    if (inputFocused) {
      for (const line of lines) {
        knownKeysRef.current.add(line.key);
        readKeysRef.current.add(line.key);
      }
      setUnreadCount(0);
      dismissAllPreviews();
      return;
    }

    const fresh = lines.filter((l) => !knownKeysRef.current.has(l.key));
    if (fresh.length === 0) {
      recomputeUnread();
      return;
    }

    const historyBatch =
      fresh.length > 1 && fresh.every((l) => isHistoryLineKey(l.key));

    for (const line of fresh) {
      knownKeysRef.current.add(line.key);
      if (historyBatch || isHistoryLineKey(line.key)) {
        readKeysRef.current.add(line.key);
        continue;
      }
      if (line.slotId === localPlayerId) {
        readKeysRef.current.add(line.key);
        continue;
      }
      readKeysRef.current.delete(line.key);
      pushPreview(line);
    }

    if (historyBatch) {
      for (const line of lines) {
        readKeysRef.current.add(line.key);
      }
    }

    recomputeUnread();
  }, [
    lines,
    inputFocused,
    localPlayerId,
    pushPreview,
    dismissAllPreviews,
    recomputeUnread,
  ]);

  const showMessagesPanel = inputFocused && lines.length > 0;

  useLayoutEffect(() => {
    if (!showMessagesPanel) return;
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 48;
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    if (maxScroll - el.scrollTop < threshold) {
      el.scrollTop = maxScroll;
    }
  }, [lines, showMessagesPanel]);

  const submit = useCallback(() => {
    const t = draft.trim();
    if (!t || !connected) return;
    onSend(t.slice(0, MAX_INPUT));
    setDraft("");
  }, [draft, connected, onSend]);

  const showUnread = unreadCount > 0 && !inputFocused;
  const showPreviewStack = previewToasts.length > 0 && !inputFocused;

  return (
    <div className={styles.wrap} aria-label="Чат комнаты">
      <div
        ref={scrollRef}
        className={`${styles.messages} ${showMessagesPanel ? styles.messagesOpen : styles.messagesCollapsed}`}
        role="log"
        aria-live="polite"
        aria-hidden={!showMessagesPanel}
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
      {showPreviewStack ? (
        <div className={styles.previewStack} role="status" aria-live="polite">
          {previewToasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.previewItem} ${toast.hiding ? styles.previewItemHiding : ""}`}
            >
              <p className={styles.previewLine}>
                <span className={styles.previewText}>{toast.line.text}</span>
                <span
                  className={styles.previewAuthor}
                  style={{
                    color: chatAuthorColor(
                      toast.line.slotId,
                      localPlayerId,
                      appearances,
                      localDisplayColor
                    ),
                  }}
                >
                  {toast.line.name}
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
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
            markAllRead();
            dismissAllPreviews();
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
