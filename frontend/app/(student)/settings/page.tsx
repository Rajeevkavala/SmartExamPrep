"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { readAuthToken } from "@/lib/authToken";
import { useAuthStore } from "@/store/authStore";

export default function SettingsPage() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [studyReminders, setStudyReminders] = useState(true);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEmailNotifications(user?.email_notifications_enabled ?? true);
    setPushNotifications(user?.push_notifications_enabled ?? true);
    setStudyReminders(user?.study_reminders_enabled ?? true);
    setDailyGoalMinutes(
      Math.max(30, Math.min(180, Number(user?.daily_study_minutes ?? 60)))
    );
  }, [user]);

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const { data } = await api.put("/auth/me", {
        daily_study_minutes: dailyGoalMinutes,
        email_notifications_enabled: emailNotifications,
        push_notifications_enabled: pushNotifications,
        study_reminders_enabled: studyReminders,
      });

      const activeToken = token ?? readAuthToken();
      if (activeToken) {
        setAuth(activeToken, data.role ?? role ?? "student", data);
      }

      setMessage("Settings saved successfully.");
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to save settings.";
      setMessage(detail);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[4rem]">
          SETTINGS
        </h1>
        <p className="text-xl text-[rgba(194,186,176,0.72)]">
          Manage notifications, reminders, and daily study goals.
        </p>
      </header>

      <section className="border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
        <h2 className="text-4xl font-semibold text-[var(--cream)]">Preferences</h2>

        <div className="mt-6 space-y-6 text-[var(--cream)]">
          <label className="flex items-center gap-3 text-xl">
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(event) => setEmailNotifications(event.target.checked)}
              className="h-4 w-4 accent-fuchsia-500"
            />
            Email notifications
          </label>

          <label className="flex items-center gap-3 text-xl">
            <input
              type="checkbox"
              checked={pushNotifications}
              onChange={(event) => setPushNotifications(event.target.checked)}
              className="h-4 w-4 accent-fuchsia-500"
            />
            Push notifications
          </label>

          <label className="flex items-center gap-3 text-xl">
            <input
              type="checkbox"
              checked={studyReminders}
              onChange={(event) => setStudyReminders(event.target.checked)}
              className="h-4 w-4 accent-fuchsia-500"
            />
            Study reminders
          </label>
        </div>

        <div className="mt-8">
          <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
            Daily Goal (Minutes)
          </p>
          <input
            type="number"
            min={30}
            max={180}
            value={dailyGoalMinutes}
            onChange={(event) => setDailyGoalMinutes(Number(event.target.value) || 30)}
            className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void saveSettings();
            }}
            disabled={isSaving}
            className="h-11 bg-[var(--fire)] px-6 font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          {message ? (
            <p className="text-sm text-[rgba(194,186,176,0.78)]">{message}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
