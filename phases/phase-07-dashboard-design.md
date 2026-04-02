# PHASE 7 — DASHBOARD DESIGN

> **Goal:** Design and build the student dashboard with ML-driven widgets, data shapes, Zustand state, and the admin dashboard with system stats.

---

## 1. Student Dashboard Widgets

| Widget | Data Source | Description |
|---|---|---|
| Overall Readiness Score | `GET /api/analysis/dashboard` | Circular gauge 0–100 |
| Weakest 3 Topics | ML weakness_score | Horizontal bars with label |
| Strongest Topics | accuracy > 80% | Green badge list |
| Today's Quiz CTA | recommendation engine | Button → `/quiz/adaptive` |
| Today's Revision | `GET /api/revision/plan` | List of due topics |
| Subject Progress | Per-subject accuracy | Progress bars |
| Recent Performance | Last 5 quiz scores | Mini line chart |
| NLP Insight Card | `POST /api/ai/explain` | Gemini-generated text block |

---

## 2. FastAPI Dashboard Response Shape

### `GET /api/analysis/dashboard` Response:

```python
# backend/services/dashboard_service.py

from sqlalchemy.orm import Session
from models.models import TopicMastery, RevisionSchedule, QuizAttempt, Subject
from datetime import datetime

def get_dashboard_data(user_id: str, db: Session) -> dict:
    masteries = (
        db.query(TopicMastery)
        .filter_by(user_id=user_id)
        .join(TopicMastery.topic)
        .all()
    )

    if not masteries:
        return {
            "readiness_score": 0,
            "weakest_topics": [],
            "strongest_topics": [],
            "subjects_progress": [],
            "todays_quiz_ready": False,
            "nlp_insight": None
        }

    # Overall readiness: mean of (100 - weakness_score) for all topics
    readiness_score = sum(100 - m.weakness_score for m in masteries) / len(masteries)

    # Sort by weakness
    sorted_masteries = sorted(masteries, key=lambda m: m.weakness_score, reverse=True)
    weakest = sorted_masteries[:3]
    strongest = sorted(masteries, key=lambda m: m.weakness_score)[:3]

    # Subject-level progress
    subject_map: dict[str, list[float]] = {}
    for m in masteries:
        sname = m.topic.subject.name
        subject_map.setdefault(sname, []).append(m.accuracy)

    subjects_progress = [
        {"subject_name": k, "accuracy": sum(v) / len(v)}
        for k, v in subject_map.items()
    ]

    # Recent quiz scores (last 5)
    recent_attempts = (
        db.query(QuizAttempt)
        .filter_by(user_id=user_id)
        .order_by(QuizAttempt.started_at.desc())
        .limit(5)
        .all()
    )

    return {
        "readiness_score": round(readiness_score, 1),
        "weakest_topics": [
            {
                "topic_id": m.topic_id,
                "topic_name": m.topic.name,
                "subject_name": m.topic.subject.name,
                "weakness_score": round(m.weakness_score, 1),
                "mastery_level": m.mastery_level,
                "accuracy": round(m.accuracy, 2),
                "total_attempts": m.total_attempts
            } for m in weakest
        ],
        "strongest_topics": [
            {
                "topic_id": m.topic_id,
                "topic_name": m.topic.name,
                "weakness_score": round(m.weakness_score, 1),
                "accuracy": round(m.accuracy, 2)
            } for m in strongest
        ],
        "subjects_progress": subjects_progress,
        "recent_scores": [
            {"score": a.score, "date": a.started_at.isoformat()} for a in recent_attempts
        ],
        "todays_quiz_ready": True,
        "nlp_insight": None  # Set by separate /api/ai/explain call
    }
```

---

## 3. Zustand Dashboard Store (`frontend/store/dashboardStore.ts`)

```typescript
import { create } from "zustand";

interface TopicItem {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  weakness_score: number;
  mastery_level: "Weak" | "Moderate" | "Strong";
  accuracy: number;
}

interface DashboardState {
  readiness_score: number;
  weakest_topics: TopicItem[];
  strongest_topics: TopicItem[];
  subjects_progress: { subject_name: string; accuracy: number }[];
  recent_scores: { score: number; date: string }[];
  nlp_insight: string | null;
  isLoaded: boolean;
  setDashboard: (data: any) => void;
  setInsight: (text: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  readiness_score: 0,
  weakest_topics: [],
  strongest_topics: [],
  subjects_progress: [],
  recent_scores: [],
  nlp_insight: null,
  isLoaded: false,
  setDashboard: (data) => set({ ...data, isLoaded: true }),
  setInsight: (text) => set({ nlp_insight: text }),
}));
```

---

## 4. Dashboard Components

### ReadinessGauge (`frontend/components/student/ReadinessGauge.tsx`)

```tsx
"use client";

interface Props {
  score: number; // 0–100
}

export default function ReadinessGauge({ score }: Props) {
  const color =
    score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="absolute" width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="64" cy="64" r="54"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold text-white">{Math.round(score)}</div>
        <div className="text-xs text-slate-500">/ 100</div>
      </div>
    </div>
  );
}
```

### WeaknessBar (`frontend/components/student/WeaknessBar.tsx`)

```tsx
interface Props {
  topic: {
    topic_name: string;
    subject_name: string;
    weakness_score: number;
    mastery_level: string;
    accuracy: number;
  };
}

export default function WeaknessBar({ topic }: Props) {
  const color =
    topic.mastery_level === "Weak"
      ? "bg-red-500"
      : topic.mastery_level === "Moderate"
      ? "bg-yellow-500"
      : "bg-green-500";

  const labelColor =
    topic.mastery_level === "Weak"
      ? "text-red-400"
      : topic.mastery_level === "Moderate"
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <div>
          <span className="text-white text-sm font-medium">{topic.topic_name}</span>
          <span className="text-slate-500 text-xs ml-2">{topic.subject_name}</span>
        </div>
        <span className={`text-xs font-medium ${labelColor}`}>
          {topic.mastery_level} — {(topic.accuracy * 100).toFixed(0)}% acc
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-700`}
          style={{ width: `${topic.weakness_score}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-0.5">
        <span>Strong</span>
        <span>Weakness Score: {topic.weakness_score.toFixed(0)}/100</span>
        <span>Weak</span>
      </div>
    </div>
  );
}
```

### NLPInsightCard (`frontend/components/student/NLPInsightCard.tsx`)

```tsx
interface Props {
  insight: string;
}

export default function NLPInsightCard({ insight }: Props) {
  return (
    <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-700 rounded-2xl p-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🤖</span>
        <div>
          <h3 className="text-indigo-300 font-semibold mb-2">AI Insight</h3>
          <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
        </div>
      </div>
    </div>
  );
}
```

### ProgressChart (`frontend/components/student/ProgressChart.tsx`)

```tsx
"use client";

interface DataPoint {
  score: number;
  date: string;
}

interface Props {
  data: DataPoint[];
}

export default function ProgressChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No quiz attempts yet. Take your first quiz!
      </div>
    );
  }

  const max = 100;
  const height = 80;
  const width = 300;
  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * width,
    y: height - (d.score / max) * height
  }));

  const polyline = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: "80px" }}>
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth="2"
        points={polyline}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" />
      ))}
    </svg>
  );
}
```

---

## 5. Admin Dashboard Page (`frontend/app/admin/page.tsx`)

```tsx
"use client";
import { useEffect, useState } from "react";
import { adminApi, api } from "@/lib/api";

interface AdminStats {
  total_questions: number;
  unverified_questions: number;
  total_subjects: number;
  total_topics: number;
  scrape_jobs_this_week: number;
  syllabus_uploads: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    // Fetch stats from multiple endpoints
    Promise.all([
      adminApi.get("/questions/?limit=1"),
      adminApi.get("/questions/?limit=1&is_verified=false"),
      adminApi.get("/content/subjects"),
      adminApi.get("/scraper/jobs"),
      adminApi.get("/syllabus/uploads"),
    ]).then(([allQ, unverQ, subjects, jobs, uploads]) => {
      const totalTopics = subjects.data.reduce(
        (sum: number, s: any) => sum + (s.topic_count || 0), 0
      );
      setStats({
        total_questions: allQ.data.total,
        unverified_questions: unverQ.data.total,
        total_subjects: subjects.data.length,
        total_topics: totalTopics,
        scrape_jobs_this_week: jobs.data.length,
        syllabus_uploads: uploads.data.length,
      });
    });
  }, []);

  const statCards = stats ? [
    { label: "Total Questions", value: stats.total_questions, icon: "❓", color: "bg-indigo-900" },
    { label: "Unverified", value: stats.unverified_questions, icon: "⚠️", color: "bg-red-900", alert: stats.unverified_questions > 0 },
    { label: "Subjects", value: stats.total_subjects, icon: "📚", color: "bg-slate-800" },
    { label: "Topics", value: stats.total_topics, icon: "🏷️", color: "bg-slate-800" },
    { label: "Scrape Jobs", value: stats.scrape_jobs_this_week, icon: "🕷️", color: "bg-slate-800" },
    { label: "PDF Uploads", value: stats.syllabus_uploads, icon: "📄", color: "bg-slate-800" },
  ] : [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
      <p className="text-slate-400 mb-8">SmartExamPrep content management overview</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {statCards.map((card) => (
          <div key={card.label}
            className={`${card.color} ${card.alert ? "ring-2 ring-red-500" : ""} rounded-2xl p-5`}>
            <div className="text-3xl mb-2">{card.icon}</div>
            <div className="text-3xl font-bold text-white">{card.value}</div>
            <div className="text-slate-400 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {stats?.unverified_questions && stats.unverified_questions > 0 ? (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-6">
          <p className="text-red-300 font-medium">
            ⚠️ {stats.unverified_questions} scraped questions need verification before going live.
          </p>
          <a href="/admin/questions?is_verified=false"
            className="text-red-400 underline text-sm mt-1 inline-block">
            Review now →
          </a>
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="/admin/scraper"
          className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 block transition">
          <div className="text-2xl mb-2">🕷️</div>
          <h3 className="text-white font-semibold">Scrape Questions</h3>
          <p className="text-slate-400 text-sm">Import from URLs automatically</p>
        </a>
        <a href="/admin/syllabus"
          className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 block transition">
          <div className="text-2xl mb-2">📄</div>
          <h3 className="text-white font-semibold">Upload Syllabus</h3>
          <p className="text-slate-400 text-sm">Extract subjects & topics from PDF</p>
        </a>
        <a href="/admin/questions"
          className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 block transition">
          <div className="text-2xl mb-2">❓</div>
          <h3 className="text-white font-semibold">Manage Questions</h3>
          <p className="text-slate-400 text-sm">CRUD for all PYQs and practice</p>
        </a>
      </div>
    </div>
  );
}
```

---

## 6. Revision Plan Page (`frontend/app/(student)/revision/page.tsx`)

```tsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function RevisionPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlan = () => {
    api.get("/revision/plan").then((r) => {
      setItems(r.data.revision_items);
      setLoading(false);
    });
  };

  useEffect(() => { fetchPlan(); }, []);

  const markDone = async (topicId: string) => {
    await api.post("/revision/mark-done", { topic_id: topicId });
    fetchPlan();
  };

  if (loading) return <div className="text-center py-20 text-slate-400">Loading revision plan...</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">📅 Revision Plan</h1>
      <p className="text-slate-400 mb-8">Topics due for revision today (spaced repetition schedule)</p>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-slate-800 rounded-2xl">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-white font-semibold text-xl">All caught up!</p>
          <p className="text-slate-400 mt-2">No revisions due today. Keep practicing!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.topic_id}
              className="bg-slate-800 rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{item.topic_name}</p>
                <p className="text-slate-400 text-sm">{item.subject_name}</p>
                <p className="text-slate-500 text-xs mt-1">
                  Last score: {item.last_score_pct?.toFixed(0)}% • Every {item.interval_days} days
                </p>
              </div>
              <button
                onClick={() => markDone(item.topic_id)}
                className="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                ✓ Done
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 7. PYQ Image Support Addendum

- Dashboard-linked quiz cards and quick actions should assume recommended questions may include `question_image_urls`.
- Any preview snippets in dashboard widgets should show an "Image-based PYQ" indicator when images are present.
- Preserve image metadata end-to-end when navigating from dashboard to adaptive/diagnostic quiz pages.
