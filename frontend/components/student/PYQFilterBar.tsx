import {
  fireButtonClass,
  ghostButtonClass,
  inputClass,
  monoLabelClass,
  panelClass,
} from "@/components/shared/brand-ui";
import { cn } from "@/lib/utils";

type PYQBrowserFilters = {
  subject_id: string;
  topic_id: string;
  difficulty: string;
  year_from: string;
  year_to: string;
  search: string;
};

export type PYQSubjectOption = {
  id: string;
  name: string;
};

export type PYQTopicOption = {
  id: string;
  subject_id: string;
  name: string;
};

export type PYQFilterOptions = {
  years: number[];
  subjects: PYQSubjectOption[];
  topics: PYQTopicOption[];
  difficulties: string[];
};

type PYQFilterBarProps = {
  filters: PYQBrowserFilters;
  options: PYQFilterOptions;
  isLoading: boolean;
  onChange: (next: Partial<PYQBrowserFilters>) => void;
  onApply: () => void;
  onReset: () => void;
};

const toDifficultyLabel = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

export default function PYQFilterBar({
  filters,
  options,
  isLoading,
  onChange,
  onApply,
  onReset,
}: PYQFilterBarProps) {
  const visibleTopics = filters.subject_id
    ? options.topics.filter((topic) => topic.subject_id === filters.subject_id)
    : options.topics;

  return (
    <section className={cn(panelClass, "p-6")}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-3">
          <span className={monoLabelClass}>Subject</span>
          <select
            value={filters.subject_id}
            onChange={(event) =>
              onChange({
                subject_id: event.target.value,
                topic_id: "",
              })
            }
            className={cn(inputClass, "mt-0 border border-white/10 rounded-full px-4")}
          >
            <option value="">All subjects</option>
            {options.subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-3">
          <span className={monoLabelClass}>Topic</span>
          <select
            value={filters.topic_id}
            onChange={(event) => onChange({ topic_id: event.target.value })}
            className={cn(inputClass, "mt-0 border border-white/10 rounded-full px-4")}
          >
            <option value="">All topics</option>
            {visibleTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-3">
          <span className={monoLabelClass}>Difficulty</span>
          <select
            value={filters.difficulty}
            onChange={(event) => onChange({ difficulty: event.target.value })}
            className={cn(inputClass, "mt-0 border border-white/10 rounded-full px-4")}
          >
            <option value="">All levels</option>
            {options.difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {toDifficultyLabel(difficulty)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-3">
          <span className={monoLabelClass}>Year from</span>
          <select
            value={filters.year_from}
            onChange={(event) => onChange({ year_from: event.target.value })}
            className={cn(inputClass, "mt-0 border border-white/10 rounded-full px-4")}
          >
            <option value="">Any</option>
            {options.years.map((year) => (
              <option key={`from-${year}`} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-3">
          <span className={monoLabelClass}>Year to</span>
          <select
            value={filters.year_to}
            onChange={(event) => onChange({ year_to: event.target.value })}
            className={cn(inputClass, "mt-0 border border-white/10 rounded-full px-4")}
          >
            <option value="">Any</option>
            {options.years.map((year) => (
              <option key={`to-${year}`} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-3">
          <span className={monoLabelClass}>Search text</span>
          <input
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Keyword in question text"
            className={cn(inputClass, "mt-0 border border-white/10 rounded-full px-4")}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onApply}
          disabled={isLoading}
          className={fireButtonClass}
        >
          {isLoading ? "Applying..." : "Apply Filters"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className={ghostButtonClass}
        >
          Reset
        </button>
      </div>
    </section>
  );
}
