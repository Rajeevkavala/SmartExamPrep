type SyllabusTopic = {
  name?: string | null;
  subtopics?: string[] | null;
};

type SyllabusSubject = {
  name?: string | null;
  topics?: SyllabusTopic[] | null;
};

export type SyllabusStructure = {
  subjects?: SyllabusSubject[] | null;
};

type SyllabusTreeViewerProps = {
  structure: SyllabusStructure;
};

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeSubtopics = (subtopics: unknown): string[] => {
  if (!Array.isArray(subtopics)) {
    return [];
  }

  return subtopics
    .filter((subtopic): subtopic is string => typeof subtopic === "string")
    .map((subtopic) => subtopic.trim())
    .filter(Boolean);
};

export default function SyllabusTreeViewer({
  structure,
}: SyllabusTreeViewerProps) {
  const subjects = Array.isArray(structure?.subjects) ? structure.subjects : [];

  const normalizedSubjects = subjects.map((subject, subjectIndex) => {
    const topics = Array.isArray(subject?.topics) ? subject.topics : [];

    return {
      key: `subject-${subjectIndex}`,
      name: normalizeText(subject?.name, `Subject ${subjectIndex + 1}`),
      topics: topics.map((topic, topicIndex) => ({
        key: `subject-${subjectIndex}-topic-${topicIndex}`,
        name: normalizeText(topic?.name, `Topic ${topicIndex + 1}`),
        subtopics: normalizeSubtopics(topic?.subtopics),
      })),
    };
  });

  const topicCount = normalizedSubjects.reduce(
    (total, subject) => total + subject.topics.length,
    0
  );

  if (!normalizedSubjects.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
        No subjects were extracted from this upload.
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="Extracted syllabus structure">
      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <p className="text-sm font-semibold text-white">
          {normalizedSubjects.length} subject
          {normalizedSubjects.length === 1 ? "" : "s"}
        </p>
        <p className="text-xs uppercase tracking-[0.08em] text-slate-400">
          {topicCount} topic{topicCount === 1 ? "" : "s"}
        </p>
      </div>

      {normalizedSubjects.map((subject, subjectIndex) => (
        <details
          key={subject.key}
          open={subjectIndex === 0}
          className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"
        >
          <summary className="flex list-none cursor-pointer items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-sm">
            <span className="font-semibold text-indigo-200">{subject.name}</span>
            <span className="text-xs text-slate-400">
              {subject.topics.length} topic{subject.topics.length === 1 ? "" : "s"}
            </span>
          </summary>

          <div className="space-y-3 border-t border-slate-800 px-4 py-3">
            {subject.topics.length ? (
              subject.topics.map((topic) => (
                <div key={topic.key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm font-medium text-slate-200">{topic.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {topic.subtopics.length ? (
                      topic.subtopics.map((subtopic, subtopicIndex) => (
                        <span
                          key={`${topic.key}-subtopic-${subtopicIndex}`}
                          className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          {subtopic}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                        No subtopics
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">
                No topics extracted for this subject.
              </p>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}
