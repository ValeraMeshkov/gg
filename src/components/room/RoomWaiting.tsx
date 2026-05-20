import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchRoom,
  joinRoom,
  openMatchmaking,
  patchRoomSettings,
  setRoomReady,
  startRoom,
  type Room,
} from "@/api/roomApi";
import { fetchRemoteProfile } from "@/api/profileApi";
import { gameHref, inviteHref, roomLobbyHref } from "@/appUrl";
import { MapSideMapPicker } from "@/components/map/MapSideMapPicker";
import { UI } from "@/constants/uiStrings";
import {
  countReadyPlayers,
  lobbyPoolPlayers,
  queueRoomPlayers,
} from "@/shared/roomRoster";
import { MIN_ROOM_PLAYERS } from "@/shared/playerSlots";
import { useRoomGameSync } from "@/hooks/useRoomGameSync";
import { useUserId } from "@/hooks/useUserId";
import styles from "./RoomPage.module.scss";

type RoomWaitingProps = {
  roomCode: string;
};

type PlayerRow = {
  userId: string;
  label: string;
  isHost: boolean;
  isYou: boolean;
  ready: boolean;
  inQueue: boolean;
};

function applyRoomFromServer(setRoom: (r: Room) => void, r: Room): void {
  setRoom(r);
  if (r.status === "playing") {
    window.location.assign(gameHref(r.mapId, r.code));
  }
}

export function RoomWaiting({ roomCode }: RoomWaitingProps) {
  const userId = useUserId();
  const [room, setRoom] = useState<Room | null>(null);
  const [playerLabels, setPlayerLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      let r = await fetchRoom(roomCode);
      if (!r) {
        setError(UI.roomNotFound);
        return;
      }
      if (!r.players.some((p) => p.userId === userId)) {
        r = await joinRoom(roomCode, userId);
      }
      applyRoomFromServer(setRoom, r);
      setError(null);

      const names: Record<string, string> = {};
      await Promise.all(
        r.players.map(async (p) => {
          const profile = await fetchRemoteProfile(p.userId);
          const name = profile?.displayName?.trim();
          if (name) names[p.userId] = name;
        })
      );
      setPlayerLabels(names);
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.roomJoinFailed);
    }
  }, [roomCode, userId]);

  useRoomGameSync({
    roomCode,
    onSnapshot: () => {},
    onCells: () => {},
    onAttackLaunch: () => {},
    onPendingCancelled: () => {},
    onPendingTailStrip: () => {},
    onGameReset: () => {},
    onAppearances: () => {},
    onAppearance: () => {},
    onProjectileCollision: () => {},
    onRoomStatus: (msg) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const next: Room = {
          ...prev,
          status: msg.status,
          mapId: msg.mapId,
          randomMapOnStart: msg.randomMapOnStart,
          hostUserId: msg.hostUserId,
          players: msg.players.map((p) => ({
            userId: p.userId,
            joinedAt: prev.players.find((x) => x.userId === p.userId)?.joinedAt ?? "",
            slotId: p.slotId,
            inMatch: p.inMatch,
            ready: p.ready,
            joinedDuringMatch: p.joinedDuringMatch,
          })),
        };
        if (next.status === "playing") {
          window.location.assign(gameHref(next.mapId, next.code));
        }
        return next;
      });
    },
  });

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const isHost = room?.hostUserId === userId;
  const readyCount = room ? countReadyPlayers(room.players) : 0;
  const myReady = room?.players.find((p) => p.userId === userId)?.ready === true;

  const buildRows = useCallback(
    (players: Room["players"]): PlayerRow[] =>
      players.map((p, i) => ({
        userId: p.userId,
        label: playerLabels[p.userId] || UI.playerSlot(i + 1),
        isHost: p.userId === room!.hostUserId,
        isYou: p.userId === userId,
        ready: p.ready === true,
        inQueue: p.joinedDuringMatch === true,
      })),
    [room, playerLabels, userId]
  );

  const poolRows = useMemo(() => {
    if (!room) return [];
    if (room.status === "matchmaking") {
      return buildRows(lobbyPoolPlayers(room.players, room.status));
    }
    return buildRows(room.players);
  }, [room, buildRows]);

  const queueRows = useMemo(() => {
    if (!room || room.status !== "matchmaking") return [];
    return buildRows(queueRoomPlayers(room.players));
  }, [room, buildRows]);

  const renderPlayer = (row: PlayerRow) => (
    <li key={row.userId}>
      {row.label}
      {row.isYou ? <span className={styles.you}> — {UI.roomYou}</span> : null}
      {row.isHost ? ` (${UI.roomHostBadge})` : null}
      {row.inQueue ? (
        <span className={styles.queueBadge}> · {UI.roomQueueBadge}</span>
      ) : null}
      {room?.status === "matchmaking" && row.ready ? (
        <span className={styles.readyBadge}> ✓ {UI.roomReadyBadge}</span>
      ) : null}
    </li>
  );

  const canOpenSearch = isHost && room?.status === "lobby";
  const canStartMatch =
    isHost &&
    room?.status === "matchmaking" &&
    readyCount >= MIN_ROOM_PLAYERS;
  const canToggleReady = room?.status === "matchmaking";

  const handleOpenSearch = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await openMatchmaking(roomCode, userId);
      applyRoomFromServer(setRoom, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.roomSearchFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleStartMatch = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await startRoom(roomCode, userId);
      window.location.assign(gameHref(r.mapId, r.code));
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.roomStartFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleReady = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await setRoomReady(roomCode, userId, !myReady);
      applyRoomFromServer(setRoom, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.roomReadyFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleMapIdChange = async (mapId: string) => {
    if (!isHost || !room) return;
    setBusy(true);
    try {
      const r = await patchRoomSettings(roomCode, userId, { mapId });
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.roomPatchFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleRandomMapChange = async (value: boolean) => {
    if (!isHost || !room) return;
    setBusy(true);
    try {
      const r = await patchRoomSettings(roomCode, userId, {
        randomMapOnStart: value,
      });
      setRoom(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : UI.roomPatchFailed);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteHref(roomCode));
    } catch {
      /* ignore */
    }
  };

  const statusHint =
    room?.status === "lobby"
      ? isHost
        ? UI.roomLobbyHostHint
        : UI.roomLobbyGuestHint
      : room?.status === "matchmaking"
        ? isHost
          ? UI.roomMatchmakingHostHint(readyCount, MIN_ROOM_PLAYERS)
          : UI.roomMatchmakingGuestHint
        : UI.roomJoinHint;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{UI.roomWaitingTitle}</h1>
      <p className={styles.code}>{roomCode}</p>
      <p className={styles.hint}>{statusHint}</p>

      {room && isHost && room.status !== "playing" ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>{UI.mapSection}</h2>
          <MapSideMapPicker
            mapId={room.mapId}
            onMapIdChange={(id) => void handleMapIdChange(id)}
            disabled={busy}
          />
          <label className={styles.field} style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              checked={room.randomMapOnStart}
              disabled={busy}
              onChange={(e) => void handleRandomMapChange(e.target.checked)}
            />
            <span className={styles.fieldLabel}>{UI.randomMapInRoom}</span>
          </label>
        </section>
      ) : null}

      {room ? (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            {UI.roomPlayersTitle} {room.players.length} / {room.maxPlayers}
          </h2>
          {queueRows.length > 0 ? (
            <>
              <h3 className={styles.subTitle}>{UI.roomPoolSection}</h3>
              <ul className={styles.players}>{poolRows.map(renderPlayer)}</ul>
              <h3 className={styles.subTitle}>{UI.roomQueueSection}</h3>
              <ul className={styles.players}>{queueRows.map(renderPlayer)}</ul>
            </>
          ) : (
            <ul className={styles.players}>{poolRows.map(renderPlayer)}</ul>
          )}

          {canOpenSearch ? (
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => void handleOpenSearch()}
              style={{ marginTop: 12 }}
            >
              {UI.roomSearchGame}
            </button>
          ) : null}

          {canToggleReady ? (
            <button
              type="button"
              className={myReady ? styles.btnSecondary : styles.btn}
              disabled={busy}
              onClick={() => void handleToggleReady()}
              style={{ marginTop: 12 }}
            >
              {myReady ? UI.roomReadyCancel : UI.roomReady}
            </button>
          ) : null}

          {isHost && room.status === "matchmaking" ? (
            <button
              type="button"
              className={styles.btn}
              disabled={busy || !canStartMatch}
              onClick={() => void handleStartMatch()}
              style={{ marginTop: 12 }}
            >
              {UI.roomPlay}
            </button>
          ) : null}

          <p className={styles.linkRow}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => void copyLink()}
            >
              {UI.linkCopy}
            </button>
          </p>
        </section>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <a className={styles.back} href={roomLobbyHref()}>
        ← {UI.roomOtherRoom}
      </a>
    </div>
  );
}
