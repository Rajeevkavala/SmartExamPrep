"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fireButtonClass,
  inputClass,
  monoLabelClass,
  PageHeader,
  panelClass,
  selectClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { api } from "@/lib/api";
import { readAuthToken } from "@/lib/authToken";
import { cn } from "@/lib/utils";
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
      <PageHeader
        eyebrow="Identity"
        title="PROFILE CONTROL"
        description="Keep your personal profile, language preferences, and exam metadata up to date so the planning system stays aligned."
        badge={
          <StatusBadge tone={user?.onboarding_completed_at ? "success" : "warning"}>
            Onboarding {onboardingLabel}
          </StatusBadge>
        }
      />

      <section className={cn(panelClass, "app-noise mx-auto max-w-[920px] p-6 sm:p-8")}>
        <h2 className="font-display text-[2.65rem] leading-none tracking-[0.06em] text-[var(--cream)]">
          PROFILE DETAILS
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <p className={cn(monoLabelClass, "mb-2")}>
              Email
            </p>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className={cn(inputClass, "mt-3 border-b-white/6 text-[rgba(194,186,176,0.85)]")}
            />
          </div>

          <div>
            <p className={cn(monoLabelClass, "mb-2")}>
              Name
            </p>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={cn(inputClass, "mt-3")}
            />
          </div>

          <div>
            <p className={cn(monoLabelClass, "mb-2")}>
              Phone
            </p>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={cn(inputClass, "mt-3")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className={cn(monoLabelClass, "mb-2")}>
                Preferred Language
              </p>
              <input
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className={cn(inputClass, "mt-3")}
              />
            </div>

            <div>
              <p className={cn(monoLabelClass, "mb-2")}>
                Timezone
              </p>
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className={cn(inputClass, "mt-3")}
              />
            </div>
          </div>

          <div>
            <p className={cn(monoLabelClass, "mb-2")}>
              Current Level
            </p>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className={cn(selectClass, "mt-3 bg-[rgba(255,255,255,0.02)] capitalize")}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="grid gap-2 rounded-[22px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[rgba(194,186,176,0.74)] md:grid-cols-2">
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
            className={cn(fireButtonClass, "h-11 px-6")}
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
          {savedMessage ? (
            <p
              className={cn(
                "text-sm",
                savedMessage === "Profile saved."
                  ? "text-emerald-300"
                  : "text-rose-300"
              )}
            >
              {savedMessage}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
