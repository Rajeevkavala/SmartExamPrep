import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import {
  clearAuthToken,
  decodeAuthToken,
  persistAuthToken,
  readAuthToken,
} from "@/lib/authToken";

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
  onboarding_state?: "complete" | "incomplete";
  roadmap_ready?: boolean;
  missing_profile_fields?: string[];
  profile_last_updated_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  subject_confidences?: SubjectConfidence[];
  known_topic_ids?: string[];
};

export const isOnboardingComplete = (user: AuthUser | null | undefined) => {
  if (!user) {
    return false;
  }

  if (typeof user.roadmap_ready === "boolean") {
    return user.roadmap_ready;
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
  syncSession: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const storage = createJSONStorage<AuthState>(() =>
  typeof window !== "undefined" ? localStorage : noopStorage
);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: null,
      setAuth: (token, role, user) => {
        persistAuthToken(token);
        set({
          token,
          role,
          user: user ? { ...user, role: user.role ?? role } : null,
        });
      },
      logout: () => {
        clearAuthToken();
        set({ token: null, role: null, user: null });
      },
      syncSession: () => {
        const token = readAuthToken();
        if (!token) {
          set({ token: null, role: null, user: null });
          return;
        }

        const decoded = decodeAuthToken(token);
        const role = decoded?.role ?? null;
        set((state) => ({
          token,
          role: role ?? state.role,
          user: state.user
            ? {
                ...state.user,
                role: state.user.role ?? role ?? undefined,
              }
            : null,
        }));
      },
    }),
    {
      name: "auth-store",
      storage,
      onRehydrateStorage: () => (state) => {
        state?.syncSession();
      },
    }
  )
);
