import { useEffect, useState } from "react";

function readPageVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

/** Вкладка в фокусе (Page Visibility API). */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(readPageVisible);

  useEffect(() => {
    const onChange = () => setVisible(readPageVisible());
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}
