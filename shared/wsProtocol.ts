export type SyncCell = {
  ownerId?: string;
  units?: number;
  /** Unix ms — пауза пассивного роста после обстрела. */
  growthPausedUntil?: number;
};

export type SyncAppearance = {
  slotId: string;
  fighter: string;
  building: string;
  /** Личный цвет игрока — виден сопернику (пули, эффекты попадания). */
  displayColor?: string;
  /** Сырое имя из профиля; пусто — клиент покажет «Игрок N». */
  displayName?: string;
};

export type WsClientMessage =
  | { type: "join"; userId: string }
  | { type: "attack"; fromIndices: number[]; toIndex: number }
  | { type: "cancel_pending"; fromIndex: number }
  | {
      type: "appearance";
      fighter: string;
      building: string;
      displayColor?: string;
      displayName?: string;
    }
  | { type: "chat"; text: string };

export type WsServerMessage =
  | {
      type: "snapshot";
      mapId: string;
      cells: SyncCell[];
      appearances: SyncAppearance[];
      /** Unix ms — база для анимации полётов. */
      serverTime: number;
      randomMapOnStart?: boolean;
    }
  | {
      type: "room_settings";
      randomMapOnStart: boolean;
    }
  | { type: "appearances"; players: SyncAppearance[] }
  | {
      type: "appearance";
      slotId: string;
      fighter: string;
      building: string;
      displayColor?: string;
      displayName?: string;
    }
  | {
      type: "attack_launch";
      attackId: string;
      attackerId: string;
      /** Скин бойца / тип оружия на момент выстрела. */
      fighter: string;
      fromIndex: number;
      toIndex: number;
      amount: number;
      /** Unix ms — момент старта залпа на сервере. */
      issuedAt: number;
      /** Unix ms — момент рассылки (якорь для синхронизации анимации). */
      serverTime: number;
    }
  | {
      /** Снята очередь невылетевших волн с клетки (S / смена цели). */
      type: "pending_cancelled";
      fromIndex: number;
    }
  | {
      /** Новый залп с клетки: очередь на другие цели обнулена. */
      type: "pending_tail_strip";
      fromIndex: number;
      keepToIndex: number;
    }
  | { type: "cells"; cells: SyncCell[]; serverTime: number }
  | {
      type: "projectile_collision";
      destroyed: readonly { attackId: string; simIndex: number }[];
      /** Точки взрыва (середина между пулями), по одной на каждую пару столкновений. */
      explosions?: readonly { x: number; y: number }[];
    }
  | {
      type: "game_reset";
      mapId: string;
      cells: SyncCell[];
      appearances: SyncAppearance[];
      serverTime: number;
      /** Перед стартом раунда — обратный отсчёт 3-2-1 на клиентах. */
      countdown: boolean;
    }
  | {
      type: "chat";
      slotId: string;
      name: string;
      text: string;
      sentAt: number;
    }
  | {
      type: "chat_history";
      messages: {
        slotId: string;
        name: string;
        text: string;
        sentAt: number;
      }[];
    }
  | { type: "error"; message: string };

export function parseWsMessage(raw: string): WsClientMessage | null {
  try {
    const data = JSON.parse(raw) as WsClientMessage;
    if (!data || typeof data !== "object" || !("type" in data)) return null;
    return data;
  } catch {
    return null;
  }
}
