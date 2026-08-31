import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setTokens: (access, refresh) => {
        set({ accessToken: access, refreshToken: refresh });
        document.cookie = `pulse-token=${access}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
      },

      setUser: (user) => set({ user }),

      logout: () => {
        set({ accessToken: null, refreshToken: null, user: null });
        document.cookie = "pulse-token=; path=/; max-age=0";
      },

      isAuthenticated: () => !!get().accessToken,
    }),
    { name: "pulse-auth" }
  )
);
