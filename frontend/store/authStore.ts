import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type UserRole = "student" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  daily_study_minutes?: number;
  [key: string]: unknown;
};

interface AuthState {
  token: string | null;
  role: UserRole | null;
  user: AuthUser | null;
  setAuth: (token: string, role: UserRole, user: AuthUser | null) => void;
  logout: () => void;
}

const TOKEN_KEY = "token";
const TOKEN_COOKIE_NAME = "token";
const TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const storage = createJSONStorage<AuthState>(() =>
  typeof window !== "undefined" ? localStorage : noopStorage
);

const persistToken = (token: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    const secureSuffix = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${TOKEN_COOKIE_MAX_AGE}; SameSite=Lax${secureSuffix}`;
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: null,
      setAuth: (token, role, user) => {
        persistToken(token);
        set({ token, role, user });
      },
      logout: () => {
        persistToken(null);
        set({ token: null, role: null, user: null });
      },
    }),
    {
      name: "auth-store",
      storage,
    }
  )
);