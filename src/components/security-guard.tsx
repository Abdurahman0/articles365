"use client";

import { useEffect } from "react";

/**
 * Best-effort content protection:
 *  - right-click / context menu disabled
 *  - DevTools / view-source / save / print keyboard shortcuts blocked
 *  - copy / cut blocked (text stays selectable for highlighting, not copying)
 *
 * NOTE: JS cannot truly stop DevTools or OS screenshots — this only raises the bar.
 */
export function SecurityGuard() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.key) return;
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "F12") return e.preventDefault();
      // DevTools / inspector
      if (mod && e.shiftKey && ["i", "j", "c", "k"].includes(k)) return e.preventDefault();
      // view-source, save, print, copy, cut, select-all
      if (mod && ["u", "s", "p", "c", "x"].includes(k)) return e.preventDefault();
    };

    const onCopy = (e: Event) => e.preventDefault();

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
    };
  }, []);

  return null;
}
