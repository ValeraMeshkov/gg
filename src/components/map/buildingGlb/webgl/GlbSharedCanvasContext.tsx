import { createContext, useContext } from "react";
import type { GlbSharedCanvasApi } from "./glbSharedCanvasTypes";

export const GlbSharedCanvasContext = createContext<GlbSharedCanvasApi | null>(
  null
);

export function useGlbSharedCanvas(): GlbSharedCanvasApi | null {
  return useContext(GlbSharedCanvasContext);
}
