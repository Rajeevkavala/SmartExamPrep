"use client";

import Image from "next/image";

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
  fullText: string;
};

const parseOption = (optionText: string, fallbackIndex: number): ParsedOption => {
  const fallbackLetter = String.fromCharCode(65 + fallbackIndex);
  const trimmed = optionText.trim();
  const match = trimmed.match(/^([A-D])[\).:\-\s]+(.*)$/i);

  if (!match) {
    return {
      letter: fallbackLetter,
      label: trimmed,
      fullText: `${fallbackLetter}. ${trimmed}`,
    };
  }

  const letter = match[1].toUpperCase();
  const label = match[2].trim() || trimmed;
  return {
    letter,
    label,
    fullText: `${letter}. ${label}`,
  };
};

const difficultyPalette: Record<string, string> = {
  easy: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  medium: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  hard: "bg-rose-500/20 text-rose-200 border-rose-400/30",
};

export default function QuizCard({
  question,
  selectedAnswer,
  onSelect,
}: QuizCardProps) {
  const parsedOptions = question.options.map((option, index) =>
    parseOption(option, index)
  );

  const safeImageUrls = (question.question_image_urls ?? []).filter(
    (url) => typeof url === "string" && url.trim().length > 0
  );

  const difficulty = (question.difficulty || "").toLowerCase();
  const difficultyClass = difficultyPalette[difficulty] ??
    "bg-slate-700/50 text-slate-200 border-slate-600/40";

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg shadow-slate-950/40">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">{question.topic_name}</p>
          <p className="text-xs text-slate-400">
            {question.subject_name}
            {question.subtopic ? ` • ${question.subtopic}` : ""}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${difficultyClass}`}
        >
          {question.difficulty}
        </span>
      </header>

      <p className="text-base leading-relaxed text-slate-100">{question.question_text}</p>

      {safeImageUrls.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {safeImageUrls.map((url, index) => (
            <div
              key={`${question.id}-img-${index}`}
              className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950"
            >
              <Image
                src={url}
                alt={`Question visual ${index + 1}`}
                width={1200}
                height={675}
                unoptimized
                className="h-auto w-full object-contain"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {parsedOptions.map((option) => {
          const isSelected = selectedAnswer === option.letter;
          return (
            <button
              key={`${question.id}-${option.letter}`}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.letter)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                isSelected
                  ? "border-indigo-400 bg-indigo-500/20 text-indigo-50"
                  : "border-slate-700 bg-slate-800/80 text-slate-200 hover:border-slate-500"
              }`}
            >
              <span className="font-semibold text-slate-100">{option.letter}.</span>{" "}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
