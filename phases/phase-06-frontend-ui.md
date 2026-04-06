# PHASE 6 â€” FRONTEND UI DEVELOPMENT (Next.js)

> **Goal:** Design and build all Next.js 14 pages for both students and admin, including the API client, Zustand store, route protection middleware, and all admin-specific components.

---

## 1. Project Setup

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false
npx shadcn-ui@latest init
npm install axios zustand
npm install @radix-ui/react-dialog @radix-ui/react-toast
npx shadcn-ui@latest add button input toast dialog table badge card
```

---

## 2. Axios API Client (`frontend/lib/api.ts`)

```typescript
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Student API client
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

// Admin API client (same base, kept separate for clarity)
export const adminApi = axios.create({
  baseURL: `${BASE_URL}/api/admin`,
  headers: { "Content-Type": "application/json" },
});

// Inject JWT token on every request
function addAuthInterceptor(instance: typeof api) {
  instance.interceptors.request.use((config) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
      return Promise.reject(err);
    }
  );
}

addAuthInterceptor(api);
addAuthInterceptor(adminApi);
```

---

## 3. Zustand Auth Store (`frontend/store/authStore.ts`)

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  role: "student" | "admin" | null;
  user: {
    id: string;
    email: string;
    full_name: string;
    daily_study_minutes: number;
  } | null;
  setAuth: (token: string, role: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      role: null,
      user: null,
      setAuth: (token, role, user) => {
        localStorage.setItem("token", token);
        set({ token, role: role as any, user });
      },
      logout: () => {
        localStorage.removeItem("token");
        set({ token: null, role: null, user: null });
      },
    }),
    { name: "auth-store" }
  )
);
```

---

## 4. Route Protection Middleware (`frontend/middleware.ts`)

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // If accessing admin routes, check role
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const decoded: any = jwtDecode(token);
      if (decoded.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // If accessing student protected routes
  if (["/dashboard", "/quiz", "/revision"].some((p) => pathname.startsWith(p))) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/quiz/:path*", "/revision/:path*", "/admin/:path*"],
};
```

---

## 5. Landing Page (`frontend/app/page.tsx`)

```tsx
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
      {/* Navbar */}
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <span className="text-2xl font-bold text-indigo-400">SmartExamPrep</span>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 rounded-lg border border-indigo-400 text-indigo-300 hover:bg-indigo-900">
            Login
          </Link>
          <Link href="/register" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center py-24 px-6">
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          GATE CSE Prep, <span className="text-indigo-400">Powered by AI</span>
        </h1>
        <p className="text-xl text-slate-300 mb-10">
          SmartExamPrep detects your weak topics, recommends your next quiz, and schedules revisions â€” all using ML.
        </p>
        <Link href="/register" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-lg font-semibold">
          Start Free Prep â†’
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6 pb-24">
        {[
          { icon: "ðŸ§ ", title: "Weakness Detection", desc: "ML model identifies your weak topics from quiz patterns" },
          { icon: "ðŸ“‹", title: "Adaptive Quizzes", desc: "Questions ranked by priority â€” focus where it matters most" },
          { icon: "ðŸ“…", title: "Spaced Revision", desc: "SM-2 algorithm schedules reviews at optimal intervals" },
        ].map((f) => (
          <div key={f.title} className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="text-xl font-bold mb-2">{f.title}</h3>
            <p className="text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
```

---

## 6. Auth Page (`frontend/app/(auth)/login/page.tsx`)

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleLogin = async () => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth(data.access_token, data.role, null);
      router.push(data.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Invalid credentials");
    }
  };

  const handleRegister = async () => {
    try {
      await api.post("/auth/register", { email, password, full_name: name });
      setTab("login");
    } catch {
      setError("Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">SmartExamPrep</h1>
        <div className="flex mb-6 bg-slate-700 rounded-lg overflow-hidden">
          {["login", "register"].map((t) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`flex-1 py-2 font-medium transition ${tab === t ? "bg-indigo-600 text-white" : "text-slate-400"}`}>
              {t === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        {tab === "register" && (
          <input className="w-full mb-3 p-3 bg-slate-700 text-white rounded-lg"
            placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="w-full mb-3 p-3 bg-slate-700 text-white rounded-lg"
          placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full mb-4 p-3 bg-slate-700 text-white rounded-lg"
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button onClick={tab === "login" ? handleLogin : handleRegister}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold">
          {tab === "login" ? "Login" : "Create Account"}
        </button>
      </div>
    </div>
  );
}
```

---

## 7. Student Dashboard (`frontend/app/(student)/dashboard/page.tsx`)

```tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import WeaknessBar from "@/components/student/WeaknessBar";
import ReadinessGauge from "@/components/student/ReadinessGauge";
import NLPInsightCard from "@/components/student/NLPInsightCard";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/analysis/dashboard").then((r) => {
      setData(r.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-20 text-slate-400">Loading your dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-white">Your Dashboard</h1>

      {/* Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-2xl p-6 flex flex-col items-center">
          <ReadinessGauge score={data.readiness_score} />
          <p className="text-slate-400 mt-2 text-sm">Overall Readiness</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">ðŸ”´ Weakest Topics</h2>
          {data.weakest_topics.slice(0, 3).map((t: any) => (
            <WeaknessBar key={t.topic_id} topic={t} />
          ))}
        </div>
      </div>

      {/* NLP Insight */}
      {data.nlp_insight && <NLPInsightCard insight={data.nlp_insight} />}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/quiz/adaptive"
          className="bg-indigo-700 hover:bg-indigo-600 rounded-xl p-6 text-center text-white font-semibold text-lg">
          ðŸ“‹ Take Today's Quiz
        </Link>
        <Link href="/revision"
          className="bg-emerald-800 hover:bg-emerald-700 rounded-xl p-6 text-center text-white font-semibold text-lg">
          ðŸ“… View Revision Plan
        </Link>
      </div>

      {/* Subject Progress */}
      <div className="bg-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">ðŸ“Š Subject Progress</h2>
        <div className="space-y-3">
          {data.subjects_progress?.map((s: any) => (
            <div key={s.subject_name} className="flex items-center gap-4">
              <span className="text-slate-300 w-48 text-sm">{s.subject_name}</span>
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full"
                  style={{ width: `${s.accuracy * 100}%` }}
                />
              </div>
              <span className="text-slate-400 text-sm">{(s.accuracy * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 8. Diagnostic Quiz Page (`frontend/app/(student)/quiz/diagnostic/page.tsx`)

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function DiagnosticQuizPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selected: string; time: number }>>({});
  const [current, setCurrent] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const router = useRouter();

  useEffect(() => {
    api.get("/quiz/diagnostic").then((r) => {
      setQuestions(r.data.questions);
      setStartTime(Date.now());
    });
  }, []);

  const selectAnswer = (qId: string, option: string) => {
    const elapsed = (Date.now() - startTime) / 1000;
    setAnswers((prev) => ({ ...prev, [qId]: { selected: option[0], time: elapsed } }));
  };

  const next = () => {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setStartTime(Date.now());
    }
  };

  const submit = async () => {
    const payload = {
      quiz_type: "diagnostic",
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id]?.selected || "A",
        time_taken_s: answers[q.id]?.time || 30,
      })),
    };
    const { data } = await api.post("/quiz/submit", payload);
    router.push(`/quiz/result/${data.attempt_id}`);
  };

  if (!questions.length) return <div className="text-center py-20 text-slate-400">Loading quiz...</div>;

  const q = questions[current];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex justify-between text-slate-400 text-sm mb-6">
        <span>Question {current + 1} of {questions.length}</span>
        <span className="bg-indigo-900 px-3 py-1 rounded-full text-indigo-300">{q.difficulty}</span>
      </div>

      <div className="bg-slate-800 rounded-2xl p-8 mb-6">
        <p className="text-white text-lg font-medium">{q.question_text}</p>
      </div>

      <div className="space-y-3 mb-8">
        {q.options.map((opt: string) => (
          <button key={opt}
            onClick={() => selectAnswer(q.id, opt)}
            className={`w-full text-left p-4 rounded-xl border transition ${
              answers[q.id]?.selected === opt[0]
                ? "border-indigo-500 bg-indigo-900/40 text-white"
                : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
            }`}>
            {opt}
          </button>
        ))}
      </div>

      {current < questions.length - 1 ? (
        <button onClick={next} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">
          Next Question â†’
        </button>
      ) : (
        <button onClick={submit} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold">
          Submit Quiz âœ“
        </button>
      )}
    </div>
  );
}
```

---

## 9. Admin Layout (`frontend/app/admin/layout.tsx`)

```tsx
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminGuard from "@/components/admin/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-slate-950 text-white">
        <AdminSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </AdminGuard>
  );
}
```

---

## 10. AdminSidebar (`frontend/components/admin/AdminSidebar.tsx`)

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";

const navLinks = [
  { href: "/admin", label: "Dashboard", icon: "ðŸ " },
  { href: "/admin/subjects", label: "Subjects", icon: "ðŸ“š" },
  { href: "/admin/questions", label: "Questions", icon: "â“" },
  { href: "/admin/scraper", label: "Scraper", icon: "ðŸ•·ï¸" },
  { href: "/admin/syllabus", label: "Syllabus", icon: "ðŸ“„" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [unverifiedCount, setUnverifiedCount] = useState(0);

  useEffect(() => {
    adminApi.get("/questions/?is_verified=false&limit=1")
      .then((r) => setUnverifiedCount(r.data.total))
      .catch(() => {});
  }, []);

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-2">
      <div className="text-xl font-bold text-indigo-400 mb-8">âš™ï¸ Admin Panel</div>
      {navLinks.map((link) => (
        <Link key={link.href} href={link.href}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
            pathname === link.href
              ? "bg-indigo-700 text-white"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}>
          <span>{link.icon}</span>
          <span>{link.label}</span>
          {link.label === "Questions" && unverifiedCount > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unverifiedCount}
            </span>
          )}
        </Link>
      ))}
    </aside>
  );
}
```

---

## 11. AdminGuard (`frontend/components/admin/AdminGuard.tsx`)

```tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    if (role !== "admin") { router.push("/dashboard"); }
  }, [role, token]);

  if (role !== "admin") return null;
  return <>{children}</>;
}
```

---

## 12. Admin Questions Page (`frontend/app/admin/questions/page.tsx`)

```tsx
"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import DataTable from "@/components/admin/DataTable";
import QuestionFormModal from "@/components/admin/QuestionFormModal";

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ difficulty: "", source_type: "", is_verified: "" });
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchQuestions = async () => {
    const params: any = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
    if (filters.difficulty) params.difficulty = filters.difficulty;
    if (filters.source_type) params.source_type = filters.source_type;
    if (filters.is_verified !== "") params.is_verified = filters.is_verified === "true";
    if (search) params.search = search;
    const { data } = await adminApi.get("/questions/", { params });
    setQuestions(data.questions);
    setTotal(data.total);
  };

  useEffect(() => { fetchQuestions(); }, [filters, search, page]);

  const handleBulkVerify = async () => {
    await adminApi.post("/questions/bulk-verify", { question_ids: selected });
    setSelected([]);
    fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await adminApi.delete(`/questions/${id}`);
    fetchQuestions();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Questions Manager</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500">
          + Add Question
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          placeholder="Search questions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 w-64"
        />
        {["easy","medium","hard"].map(d => (
          <button key={d} onClick={() => setFilters(f => ({ ...f, difficulty: f.difficulty === d ? "" : d }))}
            className={`px-3 py-1 rounded-lg border text-sm ${filters.difficulty === d ? "bg-indigo-700 border-indigo-500 text-white" : "border-slate-700 text-slate-400"}`}>
            {d}
          </button>
        ))}
        <button onClick={() => setFilters(f => ({ ...f, is_verified: f.is_verified === "false" ? "" : "false" }))}
          className={`px-3 py-1 rounded-lg border text-sm ${filters.is_verified === "false" ? "bg-red-700 border-red-500 text-white" : "border-slate-700 text-slate-400"}`}>
          Unverified Only
        </button>
        {selected.length > 0 && (
          <button onClick={handleBulkVerify}
            className="px-3 py-1 rounded-lg bg-green-700 text-white text-sm">
            Verify {selected.length} selected
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="p-3 text-left"><input type="checkbox" /></th>
              <th className="p-3 text-left">Question</th>
              <th className="p-3 text-left">Topic</th>
              <th className="p-3 text-left">Difficulty</th>
              <th className="p-3 text-left">Source</th>
              <th className="p-3 text-left">Verified</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} className="border-t border-slate-800 hover:bg-slate-800/50">
                <td className="p-3">
                  <input type="checkbox" checked={selected.includes(q.id)}
                    onChange={() => setSelected(prev =>
                      prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                    )} />
                </td>
                <td className="p-3 text-slate-200 max-w-xs truncate">{q.question_text}</td>
                <td className="p-3 text-slate-400">{q.topic?.name}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    q.difficulty === "easy" ? "bg-green-900 text-green-300" :
                    q.difficulty === "medium" ? "bg-yellow-900 text-yellow-300" :
                    "bg-red-900 text-red-300"
                  }`}>{q.difficulty}</span>
                </td>
                <td className="p-3 text-slate-400">{q.source_type}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${q.is_verified ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {q.is_verified ? "âœ“" : "Pending"}
                  </span>
                </td>
                <td className="p-3 flex gap-2">
                  {!q.is_verified && (
                    <button onClick={() => adminApi.post(`/questions/${q.id}/verify`).then(fetchQuestions)}
                      className="text-green-400 hover:text-green-300 text-xs">Verify</button>
                  )}
                  <button onClick={() => handleDelete(q.id)}
                    className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-2 mt-4 items-center text-slate-400 text-sm">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
          className="px-3 py-1 rounded bg-slate-800 disabled:opacity-40">â† Prev</button>
        <span>{page * PAGE_SIZE + 1}â€“{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
        <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
          className="px-3 py-1 rounded bg-slate-800 disabled:opacity-40">Next â†’</button>
      </div>

      {showModal && <QuestionFormModal onClose={() => setShowModal(false)} onSave={fetchQuestions} />}
    </div>
  );
}
```

---

## 13. Scraper Page (`frontend/app/admin/scraper/page.tsx`)

```tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { adminApi } from "@/lib/api";

export default function ScraperPage() {
  const [url, setUrl] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [accepted, setAccepted] = useState<number[]>([]);
  const pollRef = useRef<any>(null);

  const fetchJobs = () => adminApi.get("/scraper/jobs").then(r => setJobs(r.data));

  useEffect(() => { fetchJobs(); }, []);

  const startScrape = async () => {
    if (!url) return;
    const { data } = await adminApi.post("/scraper/start", { url });
    setUrl("");
    fetchJobs();
    pollJob(data.job_id);
  };

  const pollJob = (jobId: string) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await adminApi.get(`/scraper/jobs/${jobId}`);
      setActiveJob(data);
      setAccepted([]);
      if (data.status === "done" || data.status === "failed") {
        clearInterval(pollRef.current);
        fetchJobs();
      }
    }, 3000);
  };

  const importAccepted = async () => {
    if (!activeJob) return;
    const { data } = await adminApi.post(`/scraper/jobs/${activeJob.id}/import`, {
      accepted_indices: accepted
    });
    alert(`âœ… Imported ${data.imported} questions`);
    setActiveJob(null);
    setAccepted([]);
    fetchJobs();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ðŸ•·ï¸ URL Scraper</h1>

      {/* URL Input */}
      <div className="bg-slate-900 rounded-xl p-6 mb-8 flex gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://geeksforgeeks.org/gate-cs-2022-questions..."
          className="flex-1 bg-slate-800 text-white px-4 py-3 rounded-lg border border-slate-700"
        />
        <button onClick={startScrape}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold">
          Scrape
        </button>
      </div>

      {/* Active Job Result */}
      {activeJob && (
        <div className="bg-slate-900 rounded-xl p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-white">Scrape Job: {activeJob.url.slice(0, 60)}...</h2>
              <span className={`text-sm px-2 py-0.5 rounded mt-1 inline-block ${
                activeJob.status === "done" ? "bg-green-900 text-green-300" :
                activeJob.status === "failed" ? "bg-red-900 text-red-300" :
                "bg-yellow-900 text-yellow-300"
              }`}>{activeJob.status}</span>
            </div>
            {activeJob.status === "done" && accepted.length > 0 && (
              <button onClick={importAccepted}
                className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                Import {accepted.length} Questions
              </button>
            )}
          </div>

          {activeJob.status === "processing" && (
            <p className="text-slate-400 text-sm animate-pulse">â³ Scraping and classifying with AI...</p>
          )}

          {activeJob.status === "done" && activeJob.extracted_questions?.map((q: any, i: number) => (
            <div key={i} className="border border-slate-700 rounded-xl p-4 mb-3 bg-slate-800">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded">
                  {q.subject} â†’ {q.topic} â†’ {q.subtopic}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAccepted(prev =>
                      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                    )}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      accepted.includes(i)
                        ? "bg-green-700 text-white"
                        : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                    }`}>
                    {accepted.includes(i) ? "âœ“ Accepted" : "Accept"}
                  </button>
                </div>
              </div>
              <p className="text-white text-sm font-medium mb-2">{q.question_text}</p>
              <div className="grid grid-cols-2 gap-1 text-slate-400 text-xs">
                {q.options?.map((opt: string) => (
                  <span key={opt} className={opt[0] === q.correct_answer ? "text-green-400 font-medium" : ""}>
                    {opt}
                  </span>
                ))}
              </div>
              {q.explanation && (
                <p className="text-slate-500 text-xs mt-2 italic">{q.explanation}</p>
              )}
            </div>
          ))}

          {activeJob.status === "failed" && (
            <p className="text-red-400 text-sm">{activeJob.error_message}</p>
          )}
        </div>
      )}

      {/* Past Jobs */}
      <h2 className="text-lg font-semibold mb-3">Past Scrape Jobs</h2>
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id}
            onClick={() => { setActiveJob(job); setAccepted([]); }}
            className="bg-slate-900 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800">
            <div>
              <p className="text-white text-sm font-medium truncate max-w-md">{job.url}</p>
              <p className="text-slate-500 text-xs">{new Date(job.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-400 text-sm">{job.extracted_questions?.length || 0} found</span>
              <span className="text-green-400 text-sm">{job.questions_imported} imported</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                job.status === "done" ? "bg-green-900 text-green-300" :
                job.status === "failed" ? "bg-red-900 text-red-300" :
                "bg-yellow-900 text-yellow-300"
              }`}>{job.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 14. Syllabus Upload Page (`frontend/app/admin/syllabus/page.tsx`)

```tsx
"use client";
import { useState } from "react";
import { adminApi } from "@/lib/api";

export default function SyllabusPage() {
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    const { data: initData } = await adminApi.post("/syllabus/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    setUploading(false);
    // Poll for completion
    const pollId = setInterval(async () => {
      const { data } = await adminApi.get(`/syllabus/uploads/${initData.upload_id}`);
      setUpload(data);
      if (data.status === "done" || data.status === "failed") clearInterval(pollId);
    }, 2000);
  };

  const importToDB = async () => {
    if (!upload) return;
    const { data } = await adminApi.post(`/syllabus/uploads/${upload.id}/import`, {});
    alert(`âœ… Imported ${data.subjects_created} subjects + ${data.topics_created} topics`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">ðŸ“„ Syllabus PDF Upload</h1>

      {/* Dropzone */}
      <div className="border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center bg-slate-900 mb-6">
        <p className="text-4xl mb-4">ðŸ“‚</p>
        <p className="text-slate-300 mb-4">Drag & drop GATE CSE syllabus PDF or click to browse</p>
        <input type="file" accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden" id="pdf-input" />
        <label htmlFor="pdf-input"
          className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg">
          Browse PDF
        </label>
        {file && <p className="text-slate-400 mt-3 text-sm">Selected: {file.name}</p>}
      </div>

      {file && (
        <button onClick={handleUpload} disabled={uploading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold mb-6 disabled:opacity-50">
          {uploading ? `Uploading... ${progress}%` : "Upload & Extract"}
        </button>
      )}

      {/* Extracted Result */}
      {upload?.status === "done" && upload.extracted_structure && (
        <div className="bg-slate-900 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">ðŸ“‹ Extracted Structure</h2>
            <button onClick={importToDB}
              className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
              Import to Database
            </button>
          </div>

          <div className="space-y-4">
            {upload.extracted_structure.subjects?.map((subj: any) => (
              <div key={subj.name} className="border border-slate-700 rounded-xl p-4">
                <h3 className="text-indigo-400 font-semibold mb-2">ðŸ“š {subj.name}</h3>
                <div className="ml-4 space-y-2">
                  {subj.topics?.map((topic: any) => (
                    <div key={topic.name}>
                      <p className="text-slate-300 font-medium">â–¸ {topic.name}</p>
                      <div className="ml-4 flex flex-wrap gap-1 mt-1">
                        {topic.subtopics?.map((sub: string) => (
                          <span key={sub} className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upload?.status === "processing" && (
        <div className="bg-slate-900 rounded-xl p-6 text-center">
          <p className="text-slate-400 animate-pulse">â³ Extracting text and parsing with AI...</p>
        </div>
      )}

      {upload?.status === "failed" && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
          <p className="text-red-400">{upload.error_message || "Extraction failed."}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 15. PYQ Image Support Addendum

- Extend frontend question types with `question_image_urls: string[]`.
- Student quiz/result components must render zero-to-many images above options with responsive sizing.
- Add lazy loading and fallback placeholders for broken image URLs.
- Admin question form must support multi-image add/remove/reorder UI for `question_image_urls`.
- Scraper review page should preview extracted images per question before import.

