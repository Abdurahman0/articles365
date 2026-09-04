"use client";

import { create } from "zustand";

type Theme = "light" | "dark";
const KEY = "a365.theme";

function apply(t: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(KEY, t); } catch {}
  }
}

function initial(): Theme {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initial(),
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    apply(next);
    set({ theme: next });
  },
  setTheme: (t) => { apply(t); set({ theme: t }); },
}));

/** Inline script (runs before paint) to avoid a theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
