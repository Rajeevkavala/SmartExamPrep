"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { AuthUser } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/use-toast";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export default function OnboardingPage() {
  const router = useRouter();

  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(60);
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>("beginner");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof user?.daily_study_minutes === "number") {
      setDailyStudyMinutes(
        Math.min(Math.max(user.daily_study_minutes, 30), 180)
      );
    }

    if (
      user?.experience_level === "beginner" ||
      user?.experience_level === "intermediate" ||
      user?.experience_level === "advanced"
    ) {
      setExperienceLevel(user.experience_level);
    }
  }, [user]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const payload = {
        daily_study_minutes: dailyStudyMinutes,
        experience_level: experienceLevel,
      };

      const { data } = await api.put<AuthUser>("/auth/me", payload);

      if (token && role) {
        setAuth(token, role, data);
      }

      toast({
        title: "Preferences saved",
        description: "Starting your diagnostic quiz.",
      });
      router.push("/quiz/diagnostic");
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to save onboarding preferences.";
      toast({
        variant: "destructive",
        title: "Save failed",
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10">
      <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/60">
        <h1 className="text-2xl font-semibold text-white">Welcome to SmartExamPrep</h1>
        <p className="mt-2 text-sm text-slate-300">
          Set your daily plan so we can personalize your quiz and revision flow.
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label
                htmlFor="daily_study_minutes"
                className="text-sm font-medium text-slate-200"
              >
                Daily Study Minutes
              </label>
              <span className="rounded-lg bg-indigo-500/20 px-2.5 py-1 text-sm font-semibold text-indigo-200">
                {dailyStudyMinutes} min
              </span>
            </div>
            <input
              id="daily_study_minutes"
              type="range"
              min={30}
              max={180}
              step={5}
              value={dailyStudyMinutes}
              onChange={(event) => setDailyStudyMinutes(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
            />
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>30</span>
              <span>180</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="experience_level"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Experience Level
            </label>
            <select
              id="experience_level"
              value={experienceLevel}
              onChange={(event) =>
                setExperienceLevel(event.target.value as ExperienceLevel)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "Saving..." : "Continue to Diagnostic Quiz"}
          </button>
        </div>
      </section>
    </main>
  );
}
