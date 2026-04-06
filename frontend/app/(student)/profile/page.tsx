"use client";

import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { readAuthToken } from "@/lib/authToken";
import { useAuthStore } from "@/store/authStore";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

export default function ProfilePage() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("");
  const [timezone, setTimezone] = useState("");
  const [level, setLevel] = useState("beginner");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.full_name ?? "");
    setPhone(user?.phone ?? "");
    setLanguage(user?.language ?? "en");
    setTimezone(user?.timezone ?? "Asia/Kolkata");
    setLevel(user?.experience_level ?? "beginner");
  }, [user]);

  const onboardingLabel = useMemo(() => {
    if (user?.onboarding_completed_at) {
      return "Completed";
    }
    return "In progress";
  }, [user?.onboarding_completed_at]);

  const saveProfile = async () => {
    setIsSaving(true);
    setSavedMessage(null);

    try {
      const { data } = await api.put("/auth/me", {
        full_name: fullName,
        phone,
        language,
        timezone,
        experience_level: level,
      });

      const activeToken = token ?? readAuthToken();
      if (activeToken) {
        setAuth(activeToken, data.role ?? role ?? "student", data);
      }

      setSavedMessage("Profile saved.");
    } catch (error) {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Unable to save profile.";
      setSavedMessage(detail);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-[3rem] leading-none tracking-[0.03em] text-[var(--cream)] md:text-[4rem]">
          PROFILE
        </h1>
        <p className="text-xl text-[rgba(194,186,176,0.72)]">
          Manage your personal details and study profile.
        </p>
      </header>

      <section className="mx-auto max-w-[820px] border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.01)] p-6">
        <h2 className="text-4xl font-semibold text-[var(--cream)]">Profile Details</h2>

        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Email
            </p>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
            />
          </div>

          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Name
            </p>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
            />
          </div>

          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Phone
            </p>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
                Preferred Language
              </p>
              <input
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
              />
            </div>

            <div>
              <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
                Timezone
              </p>
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-transparent px-4 text-[var(--cream)]"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
              Current Level
            </p>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="h-11 w-full border border-[rgba(240,232,218,0.08)] bg-[var(--bg)] px-4 capitalize text-[var(--cream)]"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="grid gap-2 border border-[rgba(240,232,218,0.08)] bg-[rgba(255,255,255,0.02)] p-3 text-sm text-[rgba(194,186,176,0.72)] md:grid-cols-2">
            <p>Onboarding: {onboardingLabel}</p>
            <p>Joined: {formatDateTime(user?.created_at)}</p>
            <p>Last profile update: {formatDateTime(user?.updated_at)}</p>
            <p>Exam target: {user?.exam_target_date ?? "Not set yet"}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void saveProfile();
            }}
            disabled={isSaving}
            className="h-11 bg-[var(--fire)] px-6 font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
          {savedMessage ? (
            <p className="text-sm text-[rgba(194,186,176,0.72)]">{savedMessage}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
