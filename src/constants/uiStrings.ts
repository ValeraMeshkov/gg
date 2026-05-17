/** Общие UI-строки (русский). */
export const UI = {
  playerDefault: "Игрок",
  playerSlot: (n: number) => `Игрок ${n}`,
  gameField: "Игровое поле",
  mapQuickActions: "Быстрые действия на карте",
  selectAllOwn: "Выбрать все свои точки",
  stopFire: "Сбросить прицел и стрельбу",
  roomReconnecting: "Нет связи с сервером — переподключение…",
  dismiss: "Закрыть",
  countdownGo: "Поехали!",
  countdownLabel: "Старт через",
  outcomeWon: "Ура, победа!",
  outcomeLost: "Вы проиграли",
  outcomeDraw: "Ничья",
  newGame: "Новая игра",
  waitingHost: "Ждём хоста…",
  roomNewGameFailed: "Не удалось начать новую игру",
  randomMapInRoom: "Случайная карта",
  mapForNewRound: "Карта (новая партия)",
  serverDevHint: "Запустите сервер: npm run dev:server",
  serverNotConfigured: "Сервер не настроен (api-config.json)",
  createRoomFailed: "Не удалось создать комнату",
  googleAuthNotConfigured:
    "На сервере ещё не заданы ключи Google — см. server/.env.example",
  selectAllOwnTitle: "Выбрать все свои точки (A)",
  stopFireTitle: "Сбросить стрелки и отменить пули (S)",
  preloadPreparing: "Подготовка…",
  preloadBuildings: "Здания…",
  preloadUi: "Интерфейс…",
  preloadDone: "Готово",
  preloadBoot: "Запуск…",
  roomJoinTitle: "Подключение",
  roomJoinLead: (code: string) => `Комната ${code}`,
  roomJoinHint: "Заходим на карту…",
  roomNotStarted: "Игра в этой комнате ещё не началась",
  roomJoinFailed: "Не удалось войти",
  linkCopied: "Скопировано",
  linkCopy: "Ссылка",
  creatingRoom: "Создаём…",
  createRoom: "Создать комнату",
} as const;

import {
  BUILDING_GLB_SHORT,
  type GlbBuildingSkinId,
} from "@/components/map/buildingGlb";

export function buildingGlbLabel(id: string): string {
  return BUILDING_GLB_SHORT[id as GlbBuildingSkinId]?.label ?? id;
}
