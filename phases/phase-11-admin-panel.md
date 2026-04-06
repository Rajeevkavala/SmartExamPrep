# PHASE 11 â€” ADMIN PANEL FULL DESIGN

> **Goal:** Complete specification for the Admin Panel as a polished, production-grade internal tool â€” covering all screens, workflows, component behaviors, and implementation details for Subjects, Topics, Questions, Scraper, and Syllabus management.

---

## 1. Admin Panel Overview

The Admin Panel is a protected section of the Next.js app, accessible only to users with `role === "admin"`.

### Access Path:
```
POST /api/auth/login { email, password }
â†’ JWT with { sub: user_id, role: "admin" }
â†’ middleware.ts checks role
â†’ /admin/* routes unlocked
```

### Layout:
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  AdminSidebar          â”‚   Page Content          â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€         â”‚   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€         â”‚
â”‚  ðŸ  Dashboard          â”‚                         â”‚
â”‚  ðŸ“š Subjects           â”‚   [Dynamic per route]   â”‚
â”‚  â“ Questions  [12]    â”‚                         â”‚
â”‚  ðŸ•·ï¸ Scraper            â”‚                         â”‚
â”‚  ðŸ“„ Syllabus           â”‚                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 2. Admin Dashboard (`/admin`)

### Stats Grid:
| Stat | Source | Display |
|---|---|---|
| Total Questions | `GET /questions/?limit=1` â†’ `total` | Large number card |
| Unverified | `GET /questions/?is_verified=false&limit=1` â†’ `total` | Red badge card |
| Subjects | `GET /content/subjects` â†’ length | Number card |
| Topics | Sum of `topic_count` from subjects | Number card |
| Scrape Jobs | `GET /scraper/jobs` â†’ length | Number card |
| PDF Uploads | `GET /syllabus/uploads` â†’ length | Number card |

### Alert Banner:
- Shows if `unverified_count > 0`
- Red warning banner: "âš ï¸ X scraped questions need verification before going live"
- Link to `/admin/questions?is_verified=false`

### Quick Action Cards:
- ðŸ•·ï¸ Scrape Questions â†’ `/admin/scraper`
- ðŸ“„ Upload Syllabus â†’ `/admin/syllabus`
- â“ Manage Questions â†’ `/admin/questions`

---

## 3. Subjects Manager (`/admin/subjects`)

### Layout:
- Full-width accordion list
- Each Subject row is expandable to show its Topics
- Add Subject button (top-right)

### Subject Row:
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ â–¸ Operating Systems          12 topics  [Edit] [Delete] â”‚
â”‚   â–¾ Expand â†’ shows topic list                          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Topic Row (inside expanded subject):
```
  â”œâ”€â”€ CPU Scheduling    [5 subtopics]   [Edit] [Delete]
  â”œâ”€â”€ Memory Management [6 subtopics]   [Edit] [Delete]
  â””â”€â”€ + Add Topic
```

### Add / Edit Subject Modal:
```
Field: Subject Name (required)
Field: Description (optional)
Field: Display Order (number)
[Cancel]  [Save]
```

### Add / Edit Topic Modal:
```
Field: Topic Name (required)
Field: Subtopics (SubtopicChipEditor â€” add/remove chips)
Field: NLP Keyword Tags (chip input)
Field: Difficulty Weight (slider 0.5â€“2.0, default 1.0)
[Cancel]  [Save]
```

### SubtopicChipEditor Component:

```tsx
// frontend/components/admin/SubtopicChipEditor.tsx
"use client";
import { useState } from "react";

interface Props {
  value: string[];
  onChange: (val: string[]) => void;
}

export default function SubtopicChipEditor({ value, onChange }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const remove = (item: string) => onChange(value.filter((v) => v !== item));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2 min-h-8">
        {value.map((chip) => (
          <span key={chip}
            className="bg-indigo-900 text-indigo-300 text-sm px-3 py-1 rounded-full flex items-center gap-1">
            {chip}
            <button onClick={() => remove(chip)} className="text-indigo-500 hover:text-red-400 ml-1">Ã—</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add subtopic and press Enter"
          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg text-sm border border-slate-600"
        />
        <button onClick={add}
          className="bg-indigo-700 text-white px-4 rounded-lg text-sm">Add</button>
      </div>
    </div>
  );
}
```

---

## 4. Topics Manager (`/admin/subjects/[id]/topics`)

### Layout:
- Breadcrumb: Admin â†’ Subjects â†’ OS Topics
- List of all topics for the subject
- Sort by display_order (draggable rows in production upgrade)
- Each topic shows: name, subtopic count, difficulty weight badge, keyword tags preview

### Topic Difficulty Weight Badge:
```
1.0 â†’ ðŸŸ¢ Normal
1.5 â†’ ðŸŸ¡ Hard
2.0 â†’ ðŸ”´ Very Hard
```

### Inline Subtopic Preview:
```
CPU Scheduling   [RR] [FCFS] [SJF] [+3 more]   Wt: 1.2   [Edit] [Delete]
```

---

## 5. Questions Manager (`/admin/questions`)

### Filter Bar:
```
[Search text input] [Subject â–¾] [Topic â–¾] [Difficulty â–¾] [Source â–¾] [Verified â–¾]
                                                            [Verify Selected] [+ Add]
```

### Data Table Columns:
| Column | Type | Notes |
|---|---|---|
| Checkbox | Multi-select | For bulk actions |
| # | Row number | |
| Question | Text (truncated 80 chars) | Click â†’ detail page |
| Subject | String | |
| Topic | String | |
| Subtopic | String | |
| Difficulty | Badge (easy/medium/hard) | Color-coded |
| Source | Badge (PYQ/practice/scraped) | |
| Year | Number | Null for practice |
| Verified | âœ“ / âš ï¸ Pending | |
| Actions | Verify / Edit / Delete | |

### Bulk Actions:
- Select all visible rows
- Verify selected
- Delete selected (with confirmation)

### Row Click:
- Opens `/admin/questions/[id]` full detail page

---

## 6. Question Detail / Edit Page (`/admin/questions/[id]`)

### Layout: Two-column
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Edit Form               â”‚ Preview Panel              â”‚
â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€           â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€              â”‚
â”‚ Question Text           â”‚ Renders question as        â”‚
â”‚ Option Aâ€“D              â”‚ student would see it       â”‚
â”‚ Correct Answer          â”‚                            â”‚
â”‚ Explanation             â”‚ [Verify Button]            â”‚
â”‚ Subject/Topic/Subtopic  â”‚ [NLP Tags]                 â”‚
â”‚ Difficulty/Source/Year  â”‚                            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### QuestionFormModal Component:

```tsx
// frontend/components/admin/QuestionFormModal.tsx
"use client";
import { useState } from "react";
import { adminApi } from "@/lib/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { questionSchema } from "@/lib/validations";

export default function QuestionFormModal({
  question,
  onClose,
  onSave
}: {
  question?: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(questionSchema),
    defaultValues: question || {}
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      if (question?.id) {
        await adminApi.put(`/questions/${question.id}`, data);
      } else {
        await adminApi.post("/questions/", data);
      }
      onSave();
      onClose();
    } catch (e) {
      // Toast shown by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">
          {question ? "Edit Question" : "Add Question"}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm">Question Text</label>
            <textarea {...register("question_text")} rows={3}
              className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 mt-1" />
            {errors.question_text && (
              <p className="text-red-400 text-xs mt-1">{errors.question_text.message as string}</p>
            )}
          </div>
          {["A", "B", "C", "D"].map((letter, i) => (
            <div key={letter}>
              <label className="text-slate-400 text-sm">Option {letter}</label>
              <input {...register(`options.${i}`)}
                className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 mt-1" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-sm">Correct Answer</label>
              <select {...register("correct_answer")}
                className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 mt-1">
                {["A","B","C","D"].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-sm">Difficulty</label>
              <select {...register("difficulty")}
                className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 mt-1">
                <option>easy</option>
                <option>medium</option>
                <option>hard</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-sm">Explanation (optional)</label>
            <textarea {...register("explanation")} rows={2}
              className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 mt-1" />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50">
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 7. Scraper Page Complete Workflow

```
Step 1: Admin enters URL
Step 2: Click "Scrape" â†’ POST /api/admin/scraper/start
Step 3: Job created with status=pending
Step 4: Background task starts:
         httpx.get(url) â†’ raw HTML
         BS4.parse(html) â†’ raw question blocks
         AI API â†’ structured JSON per question
         ScrapeJob.extracted_questions = [...] 
         ScrapeJob.status = "done"
Step 5: Frontend polls GET /scraper/jobs/{id} every 3s
Step 6: Status updates: pending â†’ processing â†’ done
Step 7: Admin sees extracted question table
Step 8: Per row: toggle Accept âœ… or reject âŒ
Step 9: Click "Import Accepted" â†’ POST /scraper/jobs/{id}/import
         { accepted_indices: [0, 1, 3] }
Step 10: Backend creates Question records with is_verified=True
Step 11: Success toast + job stats updated
```

### ScrapeJobCard Component:

```tsx
// frontend/components/admin/ScrapeJobCard.tsx
interface Props {
  job: {
    id: string;
    url: string;
    status: string;
    extracted_questions: any[];
    questions_imported: number;
    created_at: string;
  };
  onClick: () => void;
}

export default function ScrapeJobCard({ job, onClick }: Props) {
  const statusColors: Record<string, string> = {
    pending: "bg-yellow-900 text-yellow-300",
    processing: "bg-blue-900 text-blue-300",
    done: "bg-green-900 text-green-300",
    failed: "bg-red-900 text-red-300",
  };

  return (
    <div onClick={onClick}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition">
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-4">
          <p className="text-white text-sm font-medium truncate">{job.url}</p>
          <p className="text-slate-500 text-xs mt-1">{new Date(job.created_at).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-slate-400 text-sm">
            {job.extracted_questions?.length || 0} extracted
          </span>
          <span className="text-green-400 text-sm">
            {job.questions_imported} imported
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[job.status] || ""}`}>
            {job.status}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 8. Syllabus Upload Workflow

```
Step 1: Admin goes to /admin/syllabus
Step 2: Drags PDF onto dropzone (or browses)
Step 3: Click "Upload & Extract"
         â†’ POST /api/admin/syllabus/upload (multipart)
         â†’ onUploadProgress updates progress bar
Step 4: Backend spawns background task:
         aiofiles saves PDF â†’ pdfplumber extracts text
         AI API â†’ {subjects: [{name, topics: [{name, subtopics}]}]}
         SyllabusUpload.extracted_structure = {...}
         SyllabusUpload.status = "done"
Step 5: Frontend polls GET /syllabus/uploads/{id} every 2s
Step 6: When done â†’ renders SyllabusTreeViewer
Step 7: Admin can visually inspect the extracted tree
Step 8: Admin clicks "Import to Database"
         â†’ POST /api/admin/syllabus/uploads/{id}/import
         â†’ Subject + Topic records created/updated
Step 9: Success toast: "âœ… 11 subjects + 65 topics imported"
```

### SyllabusTreeViewer Component:

```tsx
// frontend/components/admin/SyllabusTreeViewer.tsx
interface SubjectData {
  name: string;
  topics: { name: string; subtopics: string[] }[];
}

interface Props {
  structure: { subjects: SubjectData[] };
}

export default function SyllabusTreeViewer({ structure }: Props) {
  return (
    <div className="space-y-4">
      {structure.subjects.map((subject) => (
        <details key={subject.name} className="border border-slate-700 rounded-xl overflow-hidden">
          <summary className="bg-slate-800 px-5 py-3 cursor-pointer text-indigo-400 font-semibold hover:bg-slate-700 list-none flex justify-between items-center">
            <span>ðŸ“š {subject.name}</span>
            <span className="text-slate-500 text-sm font-normal">{subject.topics.length} topics</span>
          </summary>
          <div className="p-4 space-y-3">
            {subject.topics.map((topic) => (
              <div key={topic.name} className="ml-4">
                <p className="text-slate-200 font-medium text-sm mb-1">â–¸ {topic.name}</p>
                <div className="flex flex-wrap gap-1 ml-4">
                  {topic.subtopics.map((sub) => (
                    <span key={sub}
                      className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
```

---

## 9. Admin Security Checklist

| Security Concern | Implementation |
|---|---|
| All admin routes require role=admin JWT | `require_admin` FastAPI dependency |
| JWT secret must be strong | Min 32 chars, env var only |
| Cascade deletes are intentional | SQLAlchemy cascade="all, delete-orphan" on Subject |
| Scraped questions default unverified | `is_verified=False` until admin approves |
| PDF files stored with UUID prefix | Prevents filename collision / traversal |
| Admin mutations log created_by | Questions.created_by FK â†’ User |
| Raw HTML stored for re-processing | ScrapeJob.raw_html (not exposed to students) |
| No direct SQL in admin routes | All queries via SQLAlchemy ORM |

---

## 10. PYQ Image Support Addendum

- Questions Manager create/edit forms must support multi-image fields (`question_image_urls`) with previews.
- Question detail preview should render all attached images in order.
- Scraper review table should show extracted image thumbnails/links per candidate question.
- Import workflows must preserve image arrays when approving scraped PYQs.

