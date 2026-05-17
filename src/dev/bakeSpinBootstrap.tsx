import { StrictMode, useState, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import {
  bakeAllBuildingSpinSheets,
  type BakeSpinProgress,
} from "./bakeBuildingSpinSheets";
import {
  MAP_SPIN_SHEET_PERIOD_SEC,
  SPIN_SHEET_FRAMES,
  SPIN_SHEET_FRAME_PX,
  spinSheetPngForGlbFile,
} from "@/components/map/buildingGlb";

const onlyGlbFile =
  new URLSearchParams(window.location.search).get("only") ?? undefined;

async function saveBakedSheets(
  sheets: Awaited<ReturnType<typeof bakeAllBuildingSpinSheets>>,
  merge: boolean
): Promise<void> {
  const manifest = {
    frames: SPIN_SHEET_FRAMES,
    framePx: SPIN_SHEET_FRAME_PX,
    spinPeriodSec: MAP_SPIN_SHEET_PERIOD_SEC,
    sheets: Object.fromEntries(
      sheets.map((s) => [s.glbFile, spinSheetPngForGlbFile(s.glbFile)])
    ),
  };

  const res = await fetch("/api/building-spin-sheets/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merge,
      manifest,
      sheets: sheets.map((s) => ({
        glbFile: s.glbFile,
        pngBase64: s.pngBase64,
      })),
    }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
}

function BakeSpinPage(): ReactElement {
  const [status, setStatus] = useState(
    onlyGlbFile ? `Только: ${onlyGlbFile}` : "Готов к запеканию"
  );
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const sheets = await bakeAllBuildingSpinSheets((p: BakeSpinProgress) => {
        if (p.glbFile) {
          setStatus(`${p.done + 1} / ${p.total}: ${p.glbFile}`);
        }
      }, onlyGlbFile);

      await saveBakedSheets(sheets, Boolean(onlyGlbFile));
      setStatus(`Готово: ${sheets.length} спрайт-листов записано`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <h1>Запекание spin-sheets</h1>
      <p style={{ color: "#445", lineHeight: 1.5 }}>
        Рендер 3D → PNG ({SPIN_SHEET_FRAMES}×{SPIN_SHEET_FRAME_PX}px, суперсэмпл 2×).
        {onlyGlbFile ? ` Только ${onlyGlbFile}.` : null}
      </p>
      <button type="button" onClick={() => void run()} disabled={busy}>
        {busy ? "Запекаю…" : onlyGlbFile ? "Запечь один GLB" : "Запечь все здания"}
      </button>
      <p style={{ marginTop: 16, fontSize: 14 }}>{status}</p>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <BakeSpinPage />
    </StrictMode>
  );
}

declare global {
  interface Window {
    __bakeBuildingSpinSheets?: (
      onlyGlb?: string
    ) => Promise<{ ok: boolean; count: number }>;
  }
}

window.__bakeBuildingSpinSheets = async (onlyGlb?: string) => {
  const target = onlyGlb ?? onlyGlbFile;
  const sheets = await bakeAllBuildingSpinSheets(undefined, target);
  await saveBakedSheets(sheets, Boolean(target));
  return { ok: true, count: sheets.length };
};
