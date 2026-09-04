"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PageFit, ReaderTheme } from "@/types";

interface ReaderPrefsState {
  theme: ReaderTheme;
  fit: PageFit;
  zoom: number; // 0.8 .. 1.6
  progress: Record<string, number>; // bookId -> last page
  setTheme: (t: ReaderTheme) => void;
  setFit: (f: PageFit) => void;
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setProgress: (bookId: string, page: number) => void;
}

export const useReaderPrefs = create<ReaderPrefsState>()(
  persist(
    (set) => ({
      theme: "dark",
      fit: "width",
      zoom: 1,
      progress: {},
      setTheme: (theme) => set({ theme }),
      setFit: (fit) => set({ fit }),
      setZoom: (zoom) => set({ zoom: Math.min(1.6, Math.max(0.8, zoom)) }),
      zoomIn: () => set((s) => ({ zoom: Math.min(1.6, +(s.zoom + 0.1).toFixed(2)) })),
      zoomOut: () => set((s) => ({ zoom: Math.max(0.8, +(s.zoom - 0.1).toFixed(2)) })),
      setProgress: (bookId, page) =>
        set((s) => ({ progress: { ...s.progress, [bookId]: page } })),
    }),
    {
      name: "a365.reader-prefs",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
