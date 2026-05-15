import { useState } from "react";
import { createRoom, isRoomApiEnabled } from "../api/roomApi";
import { gameHref, roomHref } from "../appUrl";
import { getOrCreateUserId } from "../lib/userId";
import styles from "./RoomPage.module.scss";

type RoomLobbyProps = {
  mapId: string;
};

export function RoomLobby({ mapId }: RoomLobbyProps) {
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!isRoomApiEnabled()) {
      setError(
        import.meta.env.DEV
          ? "Запустите сервер: npm run dev:server"
          : "Сервер не настроен: при сборке нужен VITE_API_BASE_URL (см. DEPLOY.md)"
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const room = await createRoom(getOrCreateUserId(), mapId);
      window.location.assign(roomHref(room.code));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Введите код комнаты");
      return;
    }
    window.location.assign(roomHref(code));
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Игра вдвоём</h1>
      <p className={styles.lead}>
        Создайте комнату и отправьте ссылку другу. Когда оба в комнате — хост
        нажимает «Начать». Синхронизация ходов на карте — следующий этап.
      </p>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Создать комнату</h2>
        <button
          type="button"
          className={styles.btn}
          disabled={busy}
          onClick={() => void handleCreate()}
        >
          {busy ? "Создаём…" : "Создать комнату"}
        </button>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Войти по коду</h2>
        <div className={styles.field}>
          <input
            className={styles.input}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="ABC123"
            maxLength={8}
          />
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleJoin}
          >
            Войти
          </button>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>

      <a className={styles.back} href={gameHref(mapId)}>
        ← Одиночная игра
      </a>
    </div>
  );
}
