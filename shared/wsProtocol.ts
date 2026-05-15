export type SyncCell = {
  ownerId?: string;
  units?: number;
};

export type SyncAppearance = {
  slotId: string;
  fighter: string;
  building: string;
  /** Личный цвет игрока — виден сопернику (пули, эффекты попадания). */
  displayColor?: string;
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
    };

export type WsServerMessage =
  | {
      type: "snapshot";
      mapId: string;
      cells: SyncCell[];
      appearances: SyncAppearance[];
      /** Unix ms — база для анимации полётов. */
      serverTime: number;
    }
  | { type: "appearances"; players: SyncAppearance[] }
  | {
      type: "appearance";
      slotId: string;
      fighter: string;
      building: string;
      displayColor?: string;
    }
  | {
      type: "attack_launch";
      attackId: string;
      attackerId: string;
      fromIndex: number;
      toIndex: number;
      amount: number;
      issuedAt: number;
    }
  | { type: "cells"; cells: SyncCell[]; serverTime: number }
  | {
      type: "projectile_collision";
      destroyed: readonly { attackId: string; simIndex: number }[];
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
