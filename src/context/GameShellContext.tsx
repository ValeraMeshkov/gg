import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { PlayerShareBarEntry } from "@/components/settings/PlayerShareBar";

export type GameShareBarPayload = {
  players: readonly PlayerShareBarEntry[];
  activePlayerId: string;
} | null;

/** Кнопки в хедере во время игры в комнате (логика из GameCanvas). */
export type RoomChromeActions = {
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
} | null;

type GameShellContextValue = {
  shareBar: GameShareBarPayload;
  setShareBar: Dispatch<SetStateAction<GameShareBarPayload>>;
  /**
   * В соли док «Перед боем» скрывает оверлеи карты (GLB-слои синхронизируют паузу).
   * Выставляет GameCanvas из `soloDockExpanded`.
   */
  soloDockBlocksMapOverlays: boolean;
  setSoloDockBlocksMapOverlays: Dispatch<SetStateAction<boolean>>;
  /** Колбэк из GameCanvas для кнопки «Новая игра» в хедере (соло). */
  registerSoloBattleDockExpander: (fn: (() => void) | null) => void;
  requestExpandSoloBattleDock: () => void;
  roomChromeActions: RoomChromeActions;
  setRoomChromeActions: Dispatch<SetStateAction<RoomChromeActions>>;
};

const GameShellContext = createContext<GameShellContextValue | null>(null);

export function GameShellProvider({ children }: { children: ReactNode }) {
  const [shareBar, setShareBar] = useState<GameShareBarPayload>(null);
  const [soloDockBlocksMapOverlays, setSoloDockBlocksMapOverlays] =
    useState(false);
  const [roomChromeActions, setRoomChromeActions] =
    useState<RoomChromeActions>(null);
  const soloBattleDockExpandRef = useRef<(() => void) | null>(null);

  const registerSoloBattleDockExpander = useCallback(
    (fn: (() => void) | null) => {
      soloBattleDockExpandRef.current = fn;
    },
    []
  );

  const requestExpandSoloBattleDock = useCallback(() => {
    soloBattleDockExpandRef.current?.();
  }, []);

  const value = useMemo(
    (): GameShellContextValue => ({
      shareBar,
      setShareBar,
      soloDockBlocksMapOverlays,
      setSoloDockBlocksMapOverlays,
      registerSoloBattleDockExpander,
      requestExpandSoloBattleDock,
      roomChromeActions,
      setRoomChromeActions,
    }),
    [
      shareBar,
      soloDockBlocksMapOverlays,
      roomChromeActions,
      registerSoloBattleDockExpander,
      requestExpandSoloBattleDock,
    ]
  );

  return (
    <GameShellContext.Provider value={value}>{children}</GameShellContext.Provider>
  );
}

export function useGameShell(): GameShellContextValue {
  const v = useContext(GameShellContext);
  if (!v) {
    throw new Error("useGameShell: нет GameShellProvider");
  }
  return v;
}

/** Совместимое имя: раньше «настройки», теперь блокируется док «Перед боем». */
export function useSettingsOpen(): boolean {
  return useContext(GameShellContext)?.soloDockBlocksMapOverlays ?? false;
}
