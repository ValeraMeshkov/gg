import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { PlayerShareBarEntry } from "../components/PlayerShareBar";

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
  settingsOpen: boolean;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  settingsPanel: ReactNode;
  setSettingsPanel: Dispatch<SetStateAction<ReactNode>>;
  roomChromeActions: RoomChromeActions;
  setRoomChromeActions: Dispatch<SetStateAction<RoomChromeActions>>;
};

const GameShellContext = createContext<GameShellContextValue | null>(null);

export function GameShellProvider({ children }: { children: ReactNode }) {
  const [shareBar, setShareBar] = useState<GameShareBarPayload>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<ReactNode>(null);
  const [roomChromeActions, setRoomChromeActions] =
    useState<RoomChromeActions>(null);

  const value = useMemo(
    (): GameShellContextValue => ({
      shareBar,
      setShareBar,
      settingsOpen,
      setSettingsOpen,
      settingsPanel,
      setSettingsPanel,
      roomChromeActions,
      setRoomChromeActions,
    }),
    [shareBar, settingsOpen, settingsPanel, roomChromeActions]
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
