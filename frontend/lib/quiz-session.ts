import type { QuizQuestion } from "@/components/student/QuizCard";
import type {
  MasteryLevel,
  QuizContextPayload,
  QuizResultSnapshot,
  TopicComparison,
  TopicWeaknessSnapshot,
} from "@/store/quizStore";

export type QuizQuestionsResponse = {
  questions: QuizQuestion[];
  total: number;
};

export type WeaknessItem = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  weakness_score: number;
  mastery_level: string;
  accuracy: number;
  updated_at?: string | null;
};

export type SubmitQuizResponse = {
  attempt_id: string;
  quiz_type?: string;
  score: number;
  correct_count: number;
  total_questions: number;
  topic_scores: Record<string, number>;
  topic_comparisons?: TopicComparison[];
  readiness_before?: number | null;
  readiness_after?: number | null;
  context_payload?: QuizContextPayload | null;
  submitted_at?: string | null;
  analysis_updated_at?: string | null;
  result_metadata?: Record<string, unknown>;
};

export type AnswerState = {
  selected_answer: string;
  time_taken_s: number;
};

const normalizeTopic = (topicName: string) => topicName.trim().toLowerCase();

const toMasteryLevel = (value: string): MasteryLevel => {
  if (value === "Weak" || value === "Strong" || value === "Moderate") {
    return value;
  }

  const normalized = value.toLowerCase();
  if (normalized === "weak") {
    return "Weak";
  }
  if (normalized === "strong") {
    return "Strong";
  }
  return "Moderate";
};

const toWeaknessSnapshot = (item: WeaknessItem): TopicWeaknessSnapshot => ({
  topic_id: item.topic_id,
  topic_name: item.topic_name,
  subject_name: item.subject_name,
  weakness_score: item.weakness_score,
  mastery_level: toMasteryLevel(item.mastery_level),
  accuracy: item.accuracy,
});

export const buildTopicComparisons = (
  topicScores: Record<string, number>,
  beforeWeakness: WeaknessItem[],
  afterWeakness: WeaknessItem[]
): TopicComparison[] => {
  const beforeMap = new Map(
    beforeWeakness.map((item) => [normalizeTopic(item.topic_name), item])
  );
  const afterMap = new Map(
    afterWeakness.map((item) => [normalizeTopic(item.topic_name), item])
  );

  return Object.entries(topicScores).map(([topicName, score]) => {
    const normalized = normalizeTopic(topicName);
    const before = beforeMap.get(normalized);
    const after = afterMap.get(normalized);

    return {
      topic_id: after?.topic_id ?? before?.topic_id ?? topicName,
      topic_name: topicName,
      subject_name: after?.subject_name ?? before?.subject_name ?? "General",
      topic_score_pct: score,
      before: before ? toWeaknessSnapshot(before) : undefined,
      after: after ? toWeaknessSnapshot(after) : undefined,
    };
  });
};

export const buildStoredQuizResult = (
  response: SubmitQuizResponse,
  fallbackQuizType: string,
  topicComparisons: TopicComparison[],
  contextPayload?: QuizContextPayload | null
): QuizResultSnapshot => ({
  attempt_id: response.attempt_id,
  quiz_type: response.quiz_type ?? fallbackQuizType,
  score: response.score,
  correct_count: response.correct_count,
  total_questions: response.total_questions,
  topic_scores: response.topic_scores ?? {},
  topic_comparisons: response.topic_comparisons ?? topicComparisons,
  readiness_before: response.readiness_before ?? null,
  readiness_after: response.readiness_after ?? null,
  context_payload: response.context_payload ?? contextPayload ?? null,
  submitted_at: response.submitted_at ?? new Date().toISOString(),
  analysis_updated_at: response.analysis_updated_at ?? null,
  result_metadata: response.result_metadata ?? {},
});
