"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (u: User) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "a365.auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ user: s.user }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

export const isAdmin = (u: User | null) => u?.role === "admin";
