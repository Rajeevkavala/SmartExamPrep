"use client";

import type { ExperienceLevel } from "@/store/authStore";
import { inputClass, monoLabelClass, StatusBadge } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type OnboardingExamTargetsProps = {
  examTargetDate: string;
  dailyStudyMinutes: number;
  experienceLevel: ExperienceLevel;
  errors: Partial<
    Record<"exam_target_date" | "daily_study_minutes" | "experience_level", string>
  >;
  onExamTargetDateChange: (value: string) => void;
  onDailyStudyMinutesChange: (value: number) => void;
  onExperienceLevelChange: (value: ExperienceLevel) => void;
};

export default function OnboardingExamTargets({
  examTargetDate,
  dailyStudyMinutes,
  experienceLevel,
  errors,
  onExamTargetDateChange,
  onDailyStudyMinutesChange,
  onExperienceLevelChange,
}: OnboardingExamTargetsProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-4xl tracking-[0.08em] text-[var(--cream)]">
          SET THE EXAM TARGET
        </h2>
        <p className="mt-3 text-sm leading-7 text-[rgba(194,186,176,0.72)]">
          Give the system your timeline and your available study capacity so the first roadmap is grounded in reality.
        </p>
      </div>

      <div className="space-y-3">
        <label htmlFor="exam_target_date" className={monoLabelClass}>
          Exam target date
        </label>
        <input
          id="exam_target_date"
          type="date"
          value={examTargetDate}
          onChange={(event) => onExamTargetDateChange(event.target.value)}
          className={cn(inputClass, "mt-0 rounded-full border border-white/10 px-4")}
        />
        {errors.exam_target_date ? (
          <p className="text-xs text-rose-300">{errors.exam_target_date}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="daily_study_minutes" className={monoLabelClass}>
            Daily study minutes
          </label>
          <StatusBadge tone="fire">{dailyStudyMinutes} min</StatusBadge>
        </div>
        <input
          id="daily_study_minutes"
          type="range"
          min={30}
          max={180}
          step={5}
          value={dailyStudyMinutes}
          onChange={(event) => onDailyStudyMinutesChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10"
        />
        <div className="flex justify-between text-xs text-[rgba(194,186,176,0.58)]">
          <span>30</span>
          <span>180</span>
        </div>
        {errors.daily_study_minutes ? (
          <p className="text-xs text-rose-300">{errors.daily_study_minutes}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <label htmlFor="experience_level" className={monoLabelClass}>
          Experience level
        </label>
        <select
          id="experience_level"
          value={experienceLevel}
          onChange={(event) =>
            onExperienceLevelChange(event.target.value as ExperienceLevel)
          }
          className={cn(inputClass, "mt-0 rounded-full border border-white/10 px-4")}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        {errors.experience_level ? (
          <p className="text-xs text-rose-300">{errors.experience_level}</p>
        ) : null}
      </div>
    </div>
  );
}
