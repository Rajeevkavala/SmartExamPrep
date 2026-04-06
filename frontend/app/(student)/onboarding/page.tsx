"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import OnboardingExamTargets from "@/components/student/OnboardingExamTargets";
import OnboardingKnownTopics from "@/components/student/OnboardingKnownTopics";
import OnboardingSubjectConfidence from "@/components/student/OnboardingSubjectConfidence";
import {
  fireButtonClass,
  ghostButtonClass,
  PageHeader,
  panelClass,
  StatusBadge,
} from "@/components/shared/brand-ui";
import { api } from "@/lib/api";
import { readAuthToken } from "@/lib/authToken";
import {
  onboardingProfileSchema,
  type OnboardingProfileInput,
  type SubjectConfidenceInput,
} from "@/lib/validations";
import type { AuthUser, ExperienceLevel } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type StepField =
  | "exam_target_date"
  | "daily_study_minutes"
  | "experience_level"
  | "subject_confidences";

type SubjectSummary = {
  id: string;
  name: string;
  description?: string | null;
  topic_count?: number;
};

type TopicSummary = {
  id: string;
  subject_id: string;
  name: string;
  subtopics: string[];
  difficulty_weight: number;
};

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
};

const buildInitialSubjectConfidences = (
  subjects: SubjectSummary[],
  user: AuthUser | null
): SubjectConfidenceInput[] => {
  const savedValues = new Map(
    (user?.subject_confidences ?? []).map((item) => [
      item.subject_id,
      item.confidence_pct,
    ])
  );

  return subjects.map((subject) => ({
    subject_id: subject.id,
    confidence_pct: savedValues.get(subject.id) ?? 50,
  }));
};

const stepTitles = [
  "Exam target",
  "Subject confidence",
  "Known topics",
  "Review",
];

export default function OnboardingPage() {
  const router = useRouter();

  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const activeToken = token ?? readAuthToken();

  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<SubjectSummary[]>([]);
  const [topicCache, setTopicCache] = useState<Record<string, TopicSummary[]>>({});
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [loadingSubjectId, setLoadingSubjectId] = useState<string | null>(null);
  const [examTargetDate, setExamTargetDate] = useState("");
  const [dailyStudyMinutes, setDailyStudyMinutes] = useState(60);
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>("beginner");
  const [subjectConfidences, setSubjectConfidences] = useState<
    SubjectConfidenceInput[]
  >([]);
  const [knownTopicIds, setKnownTopicIds] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<StepField, string>>>(
    {}
  );
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitializedForm, setHasInitializedForm] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSubjects = async () => {
      try {
        const { data } = await api.get<SubjectSummary[]>("/content/subjects");
        if (active) {
          setSubjects(data);
        }
      } catch (error) {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? "Unable to load subjects right now.";
        toast({
          variant: "destructive",
          title: "Subjects unavailable",
          description: message,
        });
      } finally {
        if (active) {
          setIsLoadingSubjects(false);
        }
      }
    };

    void loadSubjects();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hasInitializedForm || isLoadingSubjects) {
      return;
    }

    setExamTargetDate(
      typeof user?.exam_target_date === "string" && user.exam_target_date
        ? user.exam_target_date
        : getTomorrowDate()
    );

    if (typeof user?.daily_study_minutes === "number") {
      setDailyStudyMinutes(Math.min(Math.max(user.daily_study_minutes, 30), 180));
    }

    if (
      user?.experience_level &&
      EXPERIENCE_LEVELS.includes(user.experience_level as ExperienceLevel)
    ) {
      setExperienceLevel(user.experience_level as ExperienceLevel);
    }

    setSubjectConfidences(buildInitialSubjectConfidences(subjects, user));
    setKnownTopicIds(user?.known_topic_ids ?? []);
    setHasInitializedForm(true);
  }, [hasInitializedForm, isLoadingSubjects, subjects, user]);

  const currentProfile: OnboardingProfileInput = {
    exam_target_date: examTargetDate,
    daily_study_minutes: dailyStudyMinutes,
    experience_level: experienceLevel,
    subject_confidences: subjectConfidences,
    known_topic_ids: knownTopicIds,
  };

  const validateStep = (targetStep: number) => {
    const result =
      targetStep === 1
        ? onboardingProfileSchema
            .pick({
              exam_target_date: true,
              daily_study_minutes: true,
              experience_level: true,
            })
            .safeParse(currentProfile)
        : targetStep === 2
          ? onboardingProfileSchema
              .pick({
                subject_confidences: true,
              })
              .safeParse(currentProfile)
          : onboardingProfileSchema.safeParse(currentProfile);

    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const nextErrors: Partial<Record<StepField, string>> = {};
    for (const issue of result.error.issues) {
      const [field] = issue.path;
      if (typeof field === "string" && !nextErrors[field as StepField]) {
        nextErrors[field as StepField] = issue.message;
      }
    }

    setFieldErrors(nextErrors);
    return false;
  };

  const handleToggleSubject = async (subjectId: string) => {
    setExpandedSubjectId((current) => (current === subjectId ? null : subjectId));

    if (topicCache[subjectId] || loadingSubjectId === subjectId) {
      return;
    }

    setLoadingSubjectId(subjectId);
    try {
      const { data } = await api.get<TopicSummary[]>(
        `/content/subjects/${subjectId}/topics`
      );
      setTopicCache((current) => ({
        ...current,
        [subjectId]: data,
      }));
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Unable to load topics for this subject.";
      toast({
        variant: "destructive",
        title: "Topics unavailable",
        description: message,
      });
    } finally {
      setLoadingSubjectId(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      return;
    }

    setIsSaving(true);
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "post-onboarding-redirect",
          "/quiz/diagnostic"
        );
      }

      const { data } = await api.put<AuthUser>("/auth/me", currentProfile);

      if (activeToken) {
        setAuth(activeToken, data.role ?? role ?? "student", data);
      }

      toast({
        title: "Onboarding complete",
        description: "Starting your diagnostic quiz.",
      });
      router.push("/quiz/diagnostic");
    } catch (error) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("post-onboarding-redirect");
      }

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
    <main className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        title="BUILD THE STUDY PROFILE THAT DRIVES THE LOOP."
        description="We use this setup to seed your roadmap, planner, confidence baseline, and the first diagnostic flow."
        badge={<StatusBadge tone="fire">Step {step} of {stepTitles.length}</StatusBadge>}
      />

      <section className={cn(panelClass, "space-y-8 p-6 sm:p-8")}>
        <div className="flex flex-wrap items-center gap-3">
          {stepTitles.map((label, index) => {
            const currentStep = index + 1;
            return (
              <StatusBadge
                key={label}
                tone={
                  currentStep === step
                    ? "fire"
                    : currentStep < step
                      ? "success"
                      : "neutral"
                }
              >
                {currentStep}. {label}
              </StatusBadge>
            );
          })}
        </div>

        {step === 1 ? (
          <OnboardingExamTargets
            examTargetDate={examTargetDate}
            dailyStudyMinutes={dailyStudyMinutes}
            experienceLevel={experienceLevel}
            errors={fieldErrors}
            onExamTargetDateChange={setExamTargetDate}
            onDailyStudyMinutesChange={setDailyStudyMinutes}
            onExperienceLevelChange={setExperienceLevel}
          />
        ) : null}

        {step === 2 ? (
          <OnboardingSubjectConfidence
            subjects={subjects}
            subjectConfidences={subjectConfidences}
            error={fieldErrors.subject_confidences}
            onConfidenceChange={(subjectId, confidencePct) =>
              setSubjectConfidences((current) =>
                current.map((item) =>
                  item.subject_id === subjectId
                    ? { ...item, confidence_pct: confidencePct }
                    : item
                )
              )
            }
          />
        ) : null}

        {step === 3 ? (
          <OnboardingKnownTopics
            subjects={subjects}
            topicCache={topicCache}
            expandedSubjectId={expandedSubjectId}
            loadingSubjectId={loadingSubjectId}
            selectedTopicIds={knownTopicIds}
            onToggleSubject={handleToggleSubject}
            onToggleTopic={(topicId) =>
              setKnownTopicIds((current) =>
                current.includes(topicId)
                  ? current.filter((item) => item !== topicId)
                  : [...current, topicId]
              )
            }
          />
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
                REVIEW BEFORE THE DIAGNOSTIC STARTS
              </h2>
              <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
                This summary becomes the context layer for your first plan and the first quiz.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/8 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
                  Exam date
                </p>
                <p className="mt-3 text-lg text-[var(--cream)]">{examTargetDate}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
                  Daily study time
                </p>
                <p className="mt-3 text-lg text-[var(--cream)]">{dailyStudyMinutes} minutes</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
                  Experience
                </p>
                <p className="mt-3 text-lg capitalize text-[var(--cream)]">{experienceLevel}</p>
              </div>
              <div className="rounded-[24px] border border-white/8 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[rgba(194,186,176,0.58)]">
                  Known topics
                </p>
                <p className="mt-3 text-lg text-[var(--cream)]">{knownTopicIds.length} selected</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            disabled={step === 1 || isSaving}
            className={ghostButtonClass}
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep(step)) {
                  setStep((current) => current + 1);
                }
              }}
              disabled={isLoadingSubjects}
              className={fireButtonClass}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving || isLoadingSubjects}
              className={fireButtonClass}
            >
              {isSaving ? "Saving..." : "Continue to diagnostic quiz"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
