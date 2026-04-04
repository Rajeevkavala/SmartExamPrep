"use client";

import { KeyboardEvent, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SubtopicChipEditorProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  disabled?: boolean;
  maxItems?: number;
};

const normalizeChip = (raw: string) => raw.trim().replace(/\s+/g, " ");

export default function SubtopicChipEditor({
  value,
  onChange,
  placeholder = "Add subtopic and press Enter",
  addLabel = "Add",
  disabled = false,
  maxItems,
}: SubtopicChipEditorProps) {
  const [input, setInput] = useState("");

  const canAddMore = useMemo(() => {
    if (typeof maxItems !== "number") {
      return true;
    }
    return value.length < maxItems;
  }, [maxItems, value.length]);

  const addChip = () => {
    if (disabled || !canAddMore) {
      return;
    }

    const normalized = normalizeChip(input);
    if (!normalized) {
      setInput("");
      return;
    }

    const exists = value.some(
      (chip) => chip.toLocaleLowerCase() === normalized.toLocaleLowerCase()
    );

    if (!exists) {
      onChange([...value, normalized]);
    }

    setInput("");
  };

  const removeChip = (chipToRemove: string) => {
    if (disabled) {
      return;
    }

    onChange(value.filter((chip) => chip !== chipToRemove));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addChip();
  };

  return (
    <div className="space-y-2">
      <div className="flex min-h-10 flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/40 p-2">
        {value.length > 0 ? (
          value.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-100"
            >
              {chip}
              <button
                type="button"
                className="rounded-full text-indigo-200 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => removeChip(chip)}
                disabled={disabled}
                aria-label={`Remove ${chip}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))
        ) : (
          <p className="px-1 text-xs text-slate-400">No chips added yet.</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="h-9 border-slate-700 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500"
          disabled={disabled || !canAddMore}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-9 shrink-0 bg-indigo-600 text-white hover:bg-indigo-500"
          onClick={addChip}
          disabled={disabled || !canAddMore}
        >
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
