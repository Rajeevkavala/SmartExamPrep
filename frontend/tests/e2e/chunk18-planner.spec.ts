import { expect, test } from "@playwright/test";

const futureExamDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const completeProfile = {
  id: "playwright-user",
  email: "student@example.com",
  role: "student",
  daily_study_minutes: 90,
  experience_level: "intermediate",
  exam_target_date: futureExamDate,
  onboarding_version: 2,
  onboarding_completed_at: "2026-04-04T12:00:00Z",
  subject_confidences: [
    {
      subject_id: "subject-os",
      confidence_pct: 72,
    },
  ],
  known_topic_ids: ["topic-cpu"],
};

const setStudentAuth = async (
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
  baseURL: string | undefined
) => {
  const appUrl = baseURL || "http://localhost:3000";

  await context.addCookies([
    {
      name: "token",
      value: "playwright-token",
      url: appUrl,
    },
  ]);

  await page.addInitScript((profile) => {
    localStorage.setItem("token", "playwright-token");
    localStorage.setItem(
      "auth-store",
      JSON.stringify({
        state: {
          token: "playwright-token",
          role: "student",
          user: profile,
        },
        version: 0,
      })
    );
  }, completeProfile);
};

const buildPlannerPayload = (status: "pending" | "completed" = "pending") => ({
  plan_id: "plan-001",
  plan_date: "2026-04-05",
  status: status === "completed" ? "completed" : "active",
  total_planned_minutes: 120,
  total_completed_minutes: status === "completed" ? 120 : 60,
  completion_pct: status === "completed" ? 100 : 50,
  generated_at: "2026-04-05T08:00:00Z",
  roadmap_id: "roadmap-001",
  roadmap_week_id: "week-001",
  roadmap_week_number: 1,
  roadmap_focus_label: "Close weak OS topics",
  carry_forward_from_plan_id: null,
  has_carry_forward: false,
  summary: {
    total_tasks: 2,
    completed_tasks: status === "completed" ? 2 : 1,
    pending_tasks: status === "completed" ? 0 : 1,
    completion_pct: status === "completed" ? 100 : 50,
    total_planned_minutes: 120,
    total_completed_minutes: status === "completed" ? 120 : 60,
  },
  tasks: [
    {
      task_id: "task-revision-1",
      task_type: "revision",
      source_type: "revision_schedule",
      subject_id: "subject-os",
      subject_name: "Operating Systems",
      topic_id: "topic-deadlocks",
      topic_name: "Deadlocks",
      title: "Revise Deadlocks",
      description: "Due now based on spaced repetition.",
      resource_hint: null,
      target_question_count: null,
      target_minutes: 30,
      sequence_order: 1,
      status,
      completed_at: status === "completed" ? "2026-04-05T09:00:00Z" : null,
      carry_forward_count: 0,
      source_payload: {
        revision_schedule_id: "schedule-1",
      },
    },
    {
      task_id: "task-practice-1",
      task_type: "practice",
      source_type: "adaptive_recommendation",
      subject_id: null,
      subject_name: null,
      topic_id: null,
      topic_name: "CPU Scheduling",
      title: "Solve adaptive practice set",
      description: "Target weak and stale topics.",
      resource_hint: "/quiz/adaptive",
      target_question_count: 10,
      target_minutes: 30,
      sequence_order: 2,
      status: "completed",
      completed_at: "2026-04-05T09:20:00Z",
      carry_forward_count: 0,
      source_payload: {
        question_ids: ["q1", "q2"],
      },
    },
  ],
});

test.describe("Chunk 18 planner page", () => {
  test("updates task completion status from planner page", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    let currentPayload = buildPlannerPayload("pending");
    let patchCalled = false;

    await page.route("**/api/planner/today", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(currentPayload),
      });
    });

    await page.route("**/api/planner/tasks/*", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "PATCH, OPTIONS",
            "access-control-allow-headers": "*",
          },
          body: "",
        });
        return;
      }

      const requestPayload = route.request().postDataJSON() as { status: string };
      expect(requestPayload.status).toBe("completed");
      patchCalled = true;
      currentPayload = buildPlannerPayload("completed");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          plan: currentPayload,
        }),
      });
    });

    await page.goto("/planner");

    await expect(page.getByText("Daily Study Planner")).toBeVisible();
    await expect(page.getByText("Revise Deadlocks")).toBeVisible();
    await page.getByRole("button", { name: "Mark Complete" }).first().click();

    await expect
      .poll(() => patchCalled)
      .toBeTruthy();
    await expect(page.getByText("completed").first()).toBeVisible();
  });

  test("planner practice task sends context payload on quiz submit", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    const plannerPayload = buildPlannerPayload("pending");
    let submitContextSeen = false;

    await page.route("**/api/planner/today", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(plannerPayload),
      });
    });

    await page.route("**/api/analysis/weakness", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/quiz/adaptive", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 1,
          questions: [
            {
              id: "aq-1",
              question_text: "Which scheduler can starve low-priority jobs?",
              options: ["A. FCFS", "B. Priority", "C. Round Robin", "D. Lottery"],
              question_image_urls: [],
              difficulty: "medium",
              subject_name: "Operating Systems",
              topic_name: "CPU Scheduling",
              subtopic: "Priority",
            },
          ],
        }),
      });
    });

    await page.route("**/api/quiz/submit", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "*",
          },
          body: "",
        });
        return;
      }

      const payload = route.request().postDataJSON() as {
        quiz_type: string;
        context_payload?: { source?: string; daily_task_id?: string } | null;
      };

      expect(payload.quiz_type).toBe("adaptive");
      expect(payload.context_payload?.source).toBe("daily_planner");
      expect(payload.context_payload?.daily_task_id).toBe("task-practice-1");
      submitContextSeen = true;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          attempt_id: "attempt-planner-1",
          quiz_type: "adaptive",
          score: 80,
          correct_count: 1,
          total_questions: 1,
          topic_scores: {
            "CPU Scheduling": 80,
          },
          context_payload: {
            source: "daily_planner",
            daily_task_id: "task-practice-1",
            planner_task_type: "practice",
          },
        }),
      });
    });

    await page.goto("/planner");
    await page.getByRole("link", { name: "Start Practice" }).click();

    await expect(page).toHaveURL(/\/quiz\/adaptive/);
    await page.getByRole("button", { name: /B\. Priority/ }).click();
    await page.getByRole("button", { name: "Submit Quiz" }).click();

    await expect
      .poll(() => submitContextSeen)
      .toBeTruthy();
    await expect(page).toHaveURL(/\/quiz\/result\/attempt-planner-1/);
    await expect(page.getByRole("link", { name: "Back to Planner" })).toBeVisible();
  });
});
