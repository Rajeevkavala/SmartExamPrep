import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export type UserRole = "student" | "admin";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type SubjectConfidence = {
  subject_id: string;
  confidence_pct: number;
};

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  language?: string | null;
  timezone?: string | null;
  role?: UserRole;
  daily_study_minutes?: number | null;
  experience_level?: ExperienceLevel | null;
  email_notifications_enabled?: boolean;
  push_notifications_enabled?: boolean;
  study_reminders_enabled?: boolean;
  exam_target_date?: string | null;
  onboarding_version?: number | null;
  onboarding_completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  subject_confidences?: SubjectConfidence[];
  known_topic_ids?: string[];
};

export const isOnboardingComplete = (user: AuthUser | null | undefined) => {
  if (!user) {
    return false;
  }

  return Boolean(
    typeof user.daily_study_minutes === "number" &&
      user.experience_level &&
      user.exam_target_date &&
      user.onboarding_version === 2 &&
      user.onboarding_completed_at &&
      Array.isArray(user.subject_confidences) &&
      user.subject_confidences.length > 0
  );
};

interface AuthState {
  token: string | null;
  role: UserRole | null;
  user: AuthUser | null;
  setAuth: (token: string, role: UserRole, user: AuthUser | null) => void;
  logout: () => void;
}

const TOKEN_KEY = "access_token";
const TOKEN_COOKIE_NAME = "access_token";
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
