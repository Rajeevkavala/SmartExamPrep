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

const buildRoadmapPayload = (focusLabel: string) => ({
  summary: {
    roadmap_id: `roadmap-${focusLabel.replace(/\s+/g, "-").toLowerCase()}`,
    status: "active",
    plan_horizon_weeks: 8,
    generation_reason: "manual_generate",
    generated_at: "2026-04-04T12:00:00Z",
    start_date: "2026-04-05",
    end_date: "2026-05-31",
    exam_target_date: futureExamDate,
    total_topics: 2,
    total_planned_minutes: 720,
    weeks_left: 8,
    generated_weeks: 2,
    generated_months: 1,
    total_months: 2,
    has_more_months: true,
    next_generation_month: 2,
  },
  weeks: [
    {
      week_number: 1,
      month_number: 1,
      start_date: "2026-04-05",
      end_date: "2026-04-11",
      planned_minutes: 360,
      focus_label: focusLabel,
      status: "active",
      topics: [
        {
          topic_id: "topic-cpu",
          topic_name: "CPU Scheduling",
          subject_id: "subject-os",
          subject_name: "Operating Systems",
          sequence_order: 1,
          priority_score: 81.5,
          planned_minutes: 180,
          goal_type: "practice",
          resources: [
            {
              title: "CPU Scheduling practice set",
              type: "practice",
              url: "https://example.com/cpu-practice",
            },
          ],
          rationale: {
            weakness_score: 78,
            subject_confidence_pct: 42,
          },
        },
      ],
      day_plan: [
        {
          day_number: 1,
          day_date: "2026-04-05",
          title: "Practice CPU Scheduling",
          planned_minutes: 90,
          status: "pending",
          completion_pct: 0,
          focus_topic_ids: ["topic-cpu"],
          resources: [
            {
              title: "CPU Scheduling practice set",
              type: "practice",
              url: "https://example.com/cpu-practice",
            },
          ],
        },
      ],
      tracking: {
        completed_days: 0,
        total_days: 1,
        completion_pct: 0,
        completed_minutes: 0,
        planned_minutes: 360,
      },
    },
    {
      week_number: 2,
      month_number: 1,
      start_date: "2026-04-12",
      end_date: "2026-04-18",
      planned_minutes: 360,
      focus_label: "Consolidation and revision",
      status: "pending",
      topics: [
        {
          topic_id: "topic-deadlocks",
          topic_name: "Deadlocks",
          subject_id: "subject-os",
          subject_name: "Operating Systems",
          sequence_order: 1,
          priority_score: 69.2,
          planned_minutes: 150,
          goal_type: "learn",
          resources: [
            {
              title: "Deadlocks concept video",
              type: "video",
              url: "https://example.com/deadlocks-video",
            },
          ],
          rationale: {
            weakness_score: 64,
            subject_confidence_pct: 42,
          },
        },
      ],
      day_plan: [
        {
          day_number: 1,
          day_date: "2026-04-12",
          title: "Learn Deadlocks",
          planned_minutes: 90,
          status: "pending",
          completion_pct: 0,
          focus_topic_ids: ["topic-deadlocks"],
          resources: [
            {
              title: "Deadlocks concept video",
              type: "video",
              url: "https://example.com/deadlocks-video",
            },
          ],
        },
      ],
      tracking: {
        completed_days: 0,
        total_days: 1,
        completion_pct: 0,
        completed_minutes: 0,
        planned_minutes: 360,
      },
    },
  ],
});

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

test.describe("Chunk 17 roadmap page", () => {
  test("shows empty state and generates roadmap", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    await page.route("**/api/roadmap/current", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "No active roadmap found. Generate one to get started.",
        }),
      });
    });

    await page.route("**/api/roadmap/generate", async (route) => {
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

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildRoadmapPayload("Close weak OS topics")),
      });
    });

    await page.goto("/roadmap");

    await expect(page.getByText("No roadmap yet")).toBeVisible();
    await page.getByRole("button", { name: "Generate Roadmap" }).click();

    await expect(page.getByRole("heading", { name: "Personalized Roadmap" })).toBeVisible();
    await expect(page.getByText("Close weak OS topics")).toBeVisible();
    await expect(page.getByText("Day 1: Practice CPU Scheduling")).toBeVisible();
  });

  test("regenerates existing roadmap", async ({ baseURL, context, page }) => {
    await setStudentAuth(page, context, baseURL);

    await page.route("**/api/roadmap/current", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildRoadmapPayload("Close weak OS topics")),
      });
    });

    await page.route("**/api/roadmap/regenerate", async (route) => {
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

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildRoadmapPayload("Rebalanced weak topics")),
      });
    });

    await page.goto("/roadmap");

    await expect(page.getByText("Close weak OS topics")).toBeVisible();
    await page.getByRole("button", { name: "Regenerate Roadmap" }).click();
    await expect(page.getByText("Rebalanced weak topics")).toBeVisible();
  });

  test("shows onboarding guidance when generation is blocked", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    await page.route("**/api/roadmap/current", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "No active roadmap found. Generate one to get started.",
        }),
      });
    });

    await page.route("**/api/roadmap/generate", async (route) => {
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

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          detail:
            "Complete onboarding before generating a roadmap. Missing: a future exam target date, at least one subject confidence.",
        }),
      });
    });

    await page.goto("/roadmap");

    await page.getByRole("button", { name: "Generate Roadmap" }).click();
    await expect(page.locator("main")).toContainText(
      "Complete onboarding before generating a roadmap."
    );
    await expect(
      page.getByRole("link", { name: "Complete Onboarding" })
    ).toBeVisible();
  });
});
