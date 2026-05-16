import { DEFAULT_MAP_ID } from "./game/maps";

const EDITOR_MAP_SESSION_KEY = "map-dot-editor-map";

export type AppRoute = {
  mapId: string;
  edit: boolean;
  /** Страница /room — создать или ввести код. */
  roomLobby: boolean;
  /** /room/ABC123 — лобби ожидания. */
  roomWaiting: boolean;
  /** Код комнаты (в лобби или в игре ?room=). */
  roomCode: string | null;
};

function appBasePath(): string {
  const base = import.meta.env.BASE_URL;
  if (!base || base === "/") return "";
  return base.replace(/\/$/, "");
}

function normalizePathname(pathname: string): string {
  const base = appBasePath();
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || "/";
  }
  return pathname;
}

function isEditPathname(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return p === "/edit" || p.endsWith("/edit");
}

function parseRoomCodeFromPath(pathname: string): string | null {
  const p = normalizePathname(pathname);
  const match = /^\/room\/([A-Za-z0-9]{4,8})\/?$/.exec(p);
  return match ? match[1]!.toUpperCase() : null;
}

function isRoomLobbyPath(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return p === "/room" || p.endsWith("/room");
}

function readEditorMapId(): string {
  try {
    const stored = sessionStorage.getItem(EDITOR_MAP_SESSION_KEY);
    if (stored) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_MAP_ID;
}

function writeEditorMapId(mapId: string): void {
  try {
    sessionStorage.setItem(EDITOR_MAP_SESSION_KEY, mapId);
  } catch {
    /* ignore */
  }
}

export function readAppRoute(): AppRoute {
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  const pathnameEdit = isEditPathname(pathname);
  const queryEdit = params.get("edit") === "1";

  if (queryEdit && !pathnameEdit) {
    const mapId = params.get("map") ?? readEditorMapId();
    const route: AppRoute = {
      edit: true,
      mapId,
      roomLobby: false,
      roomWaiting: false,
      roomCode: null,
    };
    writeAppRoute(route);
    return route;
  }

  if (pathnameEdit) {
    return {
      edit: true,
      mapId: readEditorMapId(),
      roomLobby: false,
      roomWaiting: false,
      roomCode: null,
    };
  }

  const pathRoomCode = parseRoomCodeFromPath(pathname);
  if (pathRoomCode) {
    return {
      edit: false,
      mapId: DEFAULT_MAP_ID,
      roomLobby: false,
      roomWaiting: true,
      roomCode: pathRoomCode,
    };
  }

  if (isRoomLobbyPath(pathname)) {
    return {
      edit: false,
      mapId: DEFAULT_MAP_ID,
      roomLobby: true,
      roomWaiting: false,
      roomCode: null,
    };
  }

  const queryRoom = params.get("room")?.toUpperCase() ?? null;

  return {
    edit: false,
    mapId: DEFAULT_MAP_ID,
    roomLobby: false,
    roomWaiting: false,
    roomCode: queryRoom,
  };
}

export function writeAppRoute(next: AppRoute): void {
  const base = appBasePath();

  if (next.edit) {
    writeEditorMapId(next.mapId);
    window.history.replaceState(null, "", `${base}/edit`);
    return;
  }

  if (next.roomLobby) {
    window.history.replaceState(null, "", `${base}/room`);
    return;
  }

  if (next.roomCode) {
    window.history.replaceState(
      null,
      "",
      `${base}/room/${next.roomCode}`
    );
    return;
  }

  const path = base || "/";
  window.history.replaceState(null, "", path);
}

export function gameHref(_mapId: string, roomCode?: string | null): string {
  const base = appBasePath();
  const params = new URLSearchParams();
  if (roomCode) {
    params.set("room", roomCode);
  }
  const q = params.toString();
  const path = base || "/";
  return q ? `${path}?${q}` : path;
}

export function editorHref(): string {
  const base = appBasePath();
  return `${base}/edit`;
}

export function roomLobbyHref(): string {
  const base = appBasePath();
  return `${base}/room`;
}

export function roomHref(code: string): string {
  const base = appBasePath();
  return `${base}/room/${code.toUpperCase()}`;
}

/** Полная ссылка-приглашение для друга. */
export function inviteHref(code: string): string {
  if (typeof window === "undefined") return roomHref(code);
  return `${window.location.origin}${roomHref(code)}`;
}
