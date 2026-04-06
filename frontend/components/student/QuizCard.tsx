"use client";

import Image from "next/image";
import { useState } from "react";

import { panelClass, StatusBadge } from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

export type QuizQuestion = {
  id: string;
  question_text: string;
  options: string[];
  question_image_urls?: string[];
  difficulty: string;
  subject_name: string;
  topic_name: string;
  subtopic?: string | null;
};

type QuizCardProps = {
  question: QuizQuestion;
  selectedAnswer: string | null;
  onSelect: (optionLetter: string) => void;
};

type ParsedOption = {
  letter: string;
  label: string;
};

const parseOption = (optionText: string, fallbackIndex: number): ParsedOption => {
  const fallbackLetter = String.fromCharCode(65 + fallbackIndex);
  const trimmed = optionText.trim();
  const match = trimmed.match(/^([A-D])[\).:\-\s]+(.*)$/i);

  if (!match) {
    return {
      letter: fallbackLetter,
      label: trimmed,
    };
  }

  return {
    letter: match[1].toUpperCase(),
    label: match[2].trim() || trimmed,
  };
};

function QuestionImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="rounded-[22px] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
        Unable to load image preview for this question.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(6,6,10,0.86)]">
      {!loaded ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-xs text-[rgba(194,186,176,0.72)]">
          Loading image...
        </div>
      ) : null}
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={675}
        unoptimized
        className={cn(
          "h-auto w-full object-contain transition-opacity",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function QuizCard({
  question,
  selectedAnswer,
  onSelect,
}: QuizCardProps) {
  const parsedOptions = question.options.map((option, index) =>
    parseOption(option, index)
  );

  const safeImageUrls = Array.from(
    new Set(
      (question.question_image_urls ?? [])
        .filter((url) => typeof url === "string" && url.trim().length > 0)
        .map((url) => url.trim())
    )
  ).slice(0, 6);

  return (
    <article className={cn(panelClass, "p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl tracking-[0.08em] text-[var(--cream)]">
            {question.topic_name}
          </p>
          <p className="mt-2 text-sm text-[rgba(194,186,176,0.68)]">
            {question.subject_name}
            {question.subtopic ? ` · ${question.subtopic}` : ""}
          </p>
        </div>
        <StatusBadge
          tone={
            question.difficulty.toLowerCase() === "hard"
              ? "fire"
              : question.difficulty.toLowerCase() === "medium"
                ? "warning"
                : "success"
          }
        >
          {question.difficulty}
        </StatusBadge>
      </div>

      <p className="mt-6 text-base leading-8 text-[var(--cream)]">{question.question_text}</p>

      {safeImageUrls.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {safeImageUrls.map((url, index) => (
            <QuestionImage
              key={`${question.id}-img-${index}`}
              src={url}
              alt={`Question visual ${index + 1}`}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3">
        {parsedOptions.map((option) => {
          const isSelected = selectedAnswer === option.letter;
          return (
            <button
              key={`${question.id}-${option.letter}`}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${option.letter}. ${option.label}`}
              onClick={() => onSelect(option.letter)}
              className={cn(
                "w-full rounded-[24px] border px-4 py-4 text-left text-sm transition",
                isSelected
                  ? "border-[rgba(232,82,10,0.24)] bg-[rgba(232,82,10,0.08)] text-[var(--cream)]"
                  : "border-white/8 bg-white/3 text-[rgba(194,186,176,0.76)] hover:border-white/16 hover:bg-white/5"
              )}
            >
              <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-current/30 font-mono text-[0.62rem] uppercase tracking-[0.2em]">
                {option.letter}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </article>
  );
}
