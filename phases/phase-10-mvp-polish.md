# PHASE 10 — MVP POLISH

> **Goal:** Add all production-quality UX improvements — loading states, empty states, form validation, error handling, retry logic, admin-specific polish — to make the MVP feel complete and deployable.

---

## 1. Frontend: Global Error Handling (`frontend/lib/api.ts`)

```typescript
import axios from "axios";
import { toast } from "@/components/ui/use-toast";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api",
});

// Add auth + retry + error toast interceptors
function setupInterceptors(instance: typeof api) {
  // Request: inject JWT
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Response: handle errors globally + retry once on 5xx
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;

      // Retry once on 500/502/503/504
      if (
        error.response?.status >= 500 &&
        !config._retried
      ) {
        config._retried = true;
        await new Promise((r) => setTimeout(r, 1000)); // wait 1s
        return instance(config);
      }

      // 401 → redirect to login
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Show error toast
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Something went wrong. Please try again.";

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });

      return Promise.reject(error);
    }
  );
}

setupInterceptors(api);
```

---

## 2. Frontend: Loading States

### `LoadingSpinner` Component:

```tsx
// frontend/components/shared/LoadingSpinner.tsx
export default function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">{text}</p>
    </div>
  );
}
```

### Usage Pattern:

```tsx
const [loading, setLoading] = useState(true);
if (loading) return <LoadingSpinner text="Fetching your quiz..." />;
```

---

## 3. Frontend: Empty States

```tsx
// frontend/components/shared/EmptyState.tsx
interface Props {
  icon?: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function EmptyState({ icon = "📭", title, description, ctaText, ctaHref }: Props) {
  return (
    <div className="text-center py-20 bg-slate-800 rounded-2xl">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-white font-semibold text-xl mb-2">{title}</h3>
      <p className="text-slate-400 mb-6">{description}</p>
      {ctaText && ctaHref && (
        <a href={ctaHref}
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium">
          {ctaText}
        </a>
      )}
    </div>
  );
}
```

### Usage:

```tsx
{data.weakest_topics.length === 0 && (
  <EmptyState
    icon="🎯"
    title="No data yet"
    description="Take your first diagnostic quiz to see your weakness analysis."
    ctaText="Start Diagnostic Quiz"
    ctaHref="/quiz/diagnostic"
  />
)}
```

---

## 4. Frontend: Zod Form Validation

```typescript
// frontend/lib/validations.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[0-9]/, "Must contain number"),
  full_name: z.string().min(2, "Name too short"),
});

export const questionSchema = z.object({
  question_text: z.string().min(10, "Question too short"),
  options: z.array(z.string().min(1)).length(4, "Must have exactly 4 options"),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  source_type: z.enum(["PYQ", "practice", "scraped"]),
  year: z.number().min(2000).max(2030).optional().nullable(),
});
```

### Usage in Login Form:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations";

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(loginSchema)
});

<input {...register("email")} />
{errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
```

---

## 5. Backend: Global Exception Handler (`backend/main.py`)

```python
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [{"field": e["loc"][-1], "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"detail": "Validation error", "errors": errors}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    import logging
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."}
    )
```

---

## 6. Admin Panel Polish

### Optimistic UI for Question CRUD:

```tsx
// In Questions Manager — instant table update before server confirms
const handleVerify = async (id: string) => {
  // Optimistic update
  setQuestions(prev => prev.map(q =>
    q.id === id ? { ...q, is_verified: true } : q
  ));
  try {
    await adminApi.post(`/questions/${id}/verify`);
  } catch {
    // Rollback on failure
    setQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, is_verified: false } : q
    ));
    toast({ title: "Failed to verify", variant: "destructive" });
  }
};
```

### Scrape Job Polling Hook:

```tsx
// frontend/hooks/useScrapeJobPoller.ts
import { useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/api";

export function useScrapeJobPoller(jobId: string | null) {
  const [job, setJob] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!jobId) return;

    intervalRef.current = setInterval(async () => {
      try {
        const { data } = await adminApi.get(`/scraper/jobs/${jobId}`);
        setJob(data);
        if (data.status === "done" || data.status === "failed") {
          clearInterval(intervalRef.current!);
        }
      } catch (err) {
        clearInterval(intervalRef.current!);
      }
    }, 3000);

    return () => clearInterval(intervalRef.current!);
  }, [jobId]);

  return job;
}
```

### PDF Upload Progress Bar:

```tsx
// Use in SyllabusPage
const { data } = await adminApi.post("/syllabus/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" },
  onUploadProgress: (event) => {
    if (event.total) {
      const pct = Math.round((event.loaded / event.total) * 100);
      setProgress(pct);
    }
  },
});

// Render
<div className="w-full bg-slate-700 rounded-full h-2 mt-3">
  <div
    className="bg-indigo-500 h-2 rounded-full transition-all"
    style={{ width: `${progress}%` }}
  />
</div>
<p className="text-slate-400 text-sm mt-1">{progress}% uploaded</p>
```

### Confirmation Dialog (ShadCN AlertDialog):

```tsx
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui/alert-dialog";

<AlertDialog>
  <AlertDialogTrigger asChild>
    <button className="text-red-400 text-xs">Delete</button>
  </AlertDialogTrigger>
  <AlertDialogContent className="bg-slate-900 border border-slate-700">
    <AlertDialogHeader>
      <AlertDialogTitle className="text-white">Delete Question?</AlertDialogTitle>
      <AlertDialogDescription className="text-slate-400">
        This will permanently remove the question and all associated data.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel className="bg-slate-800 text-white border-slate-700">Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleDelete(q.id)}
        className="bg-red-700 hover:bg-red-600 text-white">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Toast Notifications for All Admin Actions:

```tsx
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();

// After create:
toast({ title: "✅ Question created", description: "Question added successfully." });

// After delete:
toast({ title: "🗑️ Deleted", description: "Question removed.", variant: "destructive" });

// After import:
toast({ title: `✅ ${count} questions imported`, description: "Questions are now live." });
```

---

## 7. Progress Indicators

### Page-level progress bar (Next.js):

```bash
npm install nextjs-toploader
```

```tsx
// frontend/app/layout.tsx
import NextTopLoader from "nextjs-toploader";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NextTopLoader color="#6366f1" showSpinner={false} />
        {children}
      </body>
    </html>
  );
}
```

---

## 8. Polish Checklist

### Student UX
- [x] Loading spinner on all API calls
- [x] Empty state on dashboard (no attempts yet)
- [x] Empty state on revision plan (all caught up)
- [x] Form validation on login/register (Zod)
- [x] Global 401 redirect to login
- [x] Retry on 5xx server errors (once)
- [x] Error toast on all failed API calls
- [x] Page transition loading bar (nextjs-toploader)

### Admin UX
- [x] Optimistic UI for question verify/delete
- [x] Scrape job polling every 3s until done
- [x] PDF upload progress bar
- [x] Confirmation dialog before delete/bulk actions
- [x] Toast notifications for all mutations
- [x] Unverified count badge on sidebar
- [x] Pagination on questions table
- [x] Search + filter bar on questions

---

## 9. PYQ Image Support Addendum

- Add image loading skeletons/fallback placeholders in quiz and admin question preview components.
- Validate `question_image_urls` client-side and server-side (URL format, dedupe, max count guardrails).
- Ensure upload/scrape/import actions display clear status when image URLs are missing or broken.
