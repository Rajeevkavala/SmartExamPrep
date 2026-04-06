import { expect, test } from "@playwright/test";

const futureExamDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const completedStudentProfile = {
  id: "playwright-user",
  email: "student@example.com",
  full_name: "Playwright Student",
  role: "student",
  daily_study_minutes: 95,
  experience_level: "intermediate",
  exam_target_date: futureExamDate,
  onboarding_version: 2,
  onboarding_completed_at: "2026-04-04T12:00:00Z",
  subject_confidences: [
    {
      subject_id: "11111111-1111-4111-8111-111111111111",
      confidence_pct: 70,
    },
  ],
  known_topic_ids: ["33333333-3333-4333-8333-333333333333"],
};

const corsHeaders = {
  "access-control-allow-origin": "http://127.0.0.1:3000",
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

test.describe("Chunk 11 student pages", () => {
  test("landing page shows hero and feature cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "STUDY WITH"
    );
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Preparing Free/ })).toBeVisible();
    await expect(page.getByText("Adaptive Roadmap").first()).toBeVisible();
    await expect(page.getByText("PYQ Bank").first()).toBeVisible();
    await expect(page.getByText("Study Chat").first()).toBeVisible();
  });

  test("login/register tabs and validation render correctly", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters.")
    ).toBeVisible();

    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
  });

  test("student login routes incomplete profiles to onboarding", async ({
    page,
  }) => {
    await page.route("**/api/content/subjects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "playwright-token",
          role: "student",
        }),
      });
    });

    await page.route("**/api/auth/me", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({
          id: "playwright-user",
          email: "student@example.com",
          full_name: "Playwright Student",
          role: "student",
          daily_study_minutes: 60,
          experience_level: "beginner",
          exam_target_date: null,
          onboarding_version: null,
          onboarding_completed_at: null,
          subject_confidences: [],
          known_topic_ids: [],
        }),
      });
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill("student@example.com");
    await page.getByLabel("Password").fill("Password123");
    await page.getByRole("button", { name: "Sign In" }).last().click();

    await page.waitForURL(/\/onboarding/, { timeout: 30000 });
  });

  test("onboarding submits multi-step profile and redirects", async ({
    baseURL,
    context,
    page,
  }) => {
    const appUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "access_token",
        value: "playwright-token",
        url: appUrl,
      },
    ]);

    await page.addInitScript(() => {
      localStorage.setItem("access_token", "playwright-token");
      localStorage.setItem(
        "auth-store",
        JSON.stringify({
          state: {
            token: "playwright-token",
            role: "student",
            user: {
              id: "playwright-user",
              email: "student@example.com",
              full_name: "Playwright Student",
              daily_study_minutes: 60,
              experience_level: "beginner",
              exam_target_date: null,
              onboarding_version: null,
              onboarding_completed_at: null,
              subject_confidences: [],
              known_topic_ids: [],
            },
          },
          version: 0,
        })
      );
    });

    await page.route("**/api/content/subjects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Operating Systems",
            description: "Core OS concepts",
            topic_count: 2,
          },
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Computer Networks",
            description: "Networking fundamentals",
            topic_count: 1,
          },
        ]),
      });
    });

    await page.route(
      "**/api/content/subjects/11111111-1111-4111-8111-111111111111/topics",
      async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "33333333-3333-4333-8333-333333333333",
            subject_id: "11111111-1111-4111-8111-111111111111",
            name: "CPU Scheduling",
            subtopics: ["Priority Scheduling", "Round Robin"],
            difficulty_weight: 1,
          },
        ]),
      });
    }
    );

    await page.route("**/api/auth/me", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
        return;
      }

      if (route.request().method() !== "PUT") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify(completedStudentProfile),
      });
    });

    await page.route("**/api/quiz/diagnostic", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 0,
          questions: [],
        }),
      });
    });

    await page.goto("/onboarding");
    await expect
      .poll(async () => page.getByLabel("Exam Target Date").inputValue())
      .not.toBe("");
    await page.getByLabel("Exam Target Date").fill(futureExamDate);
    await page.getByLabel("Daily Study Minutes").evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = "95";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.getByLabel("Experience Level").selectOption("intermediate");
    await page.getByRole("button", { name: "Continue" }).click();

    await page
      .getByLabel("Operating Systems confidence")
      .evaluate((element) => {
        const input = element as HTMLInputElement;
        input.value = "70";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await page
      .getByLabel("Computer Networks confidence")
      .evaluate((element) => {
        const input = element as HTMLInputElement;
        input.value = "55";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Known Topics")).toBeVisible();
    await page.getByRole("button", { name: /Operating Systems/ }).click();
    await page.getByLabel("CPU Scheduling").check();
    await page.getByRole("button", { name: "Continue" }).click();

    await page
      .getByRole("button", { name: "Continue to Diagnostic Quiz" })
      .click();

    await expect(page).toHaveURL(/\/quiz\/diagnostic/, { timeout: 15000 });
  });

  test("incomplete students visiting dashboard are redirected to onboarding", async ({
    baseURL,
    context,
    page,
  }) => {
    const appUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "access_token",
        value: "playwright-token",
        url: appUrl,
      },
    ]);

    await page.addInitScript(() => {
      localStorage.setItem("access_token", "playwright-token");
      localStorage.setItem(
        "auth-store",
        JSON.stringify({
          state: {
            token: "playwright-token",
            role: "student",
            user: {
              id: "playwright-user",
              email: "student@example.com",
              full_name: "Playwright Student",
              daily_study_minutes: 60,
              experience_level: "beginner",
              exam_target_date: null,
              onboarding_version: null,
              onboarding_completed_at: null,
              subject_confidences: [],
              known_topic_ids: [],
            },
          },
          version: 0,
        })
      );
    });

    await page.route("**/api/content/subjects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("student guard hydrates from the auth cookie when local storage is empty", async ({
    baseURL,
    context,
    page,
  }) => {
    const appUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "access_token",
        value: "playwright-token",
        url: appUrl,
      },
    ]);

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "playwright-user",
          email: "student@example.com",
          full_name: "Playwright Student",
          role: "student",
          daily_study_minutes: 60,
          experience_level: "beginner",
          exam_target_date: null,
          onboarding_version: null,
          onboarding_completed_at: null,
          subject_confidences: [],
          known_topic_ids: [],
        }),
      });
    });

    await page.route("**/api/content/subjects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/onboarding/);
  });

  test("dashboard renders with mocked API payload", async ({
    baseURL,
    context,
    page,
  }) => {
    const appUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "access_token",
        value: "playwright-token",
        url: appUrl,
      },
    ]);

    await page.addInitScript((profile) => {
      localStorage.setItem("access_token", "playwright-token");
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
    }, completedStudentProfile);

    await page.route("**/api/analysis/dashboard", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill({
          status: 204,
          headers: corsHeaders,
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: "application/json",
        body: JSON.stringify({
          readiness_score: 63.7,
          weakest_topics: [
            {
              topic_id: "t1",
              topic_name: "CPU Scheduling",
              subject_name: "Operating Systems",
              weakness_score: 78,
              mastery_level: "Weak",
              accuracy: 0.42,
              total_attempts: 8,
            },
            {
              topic_id: "t2",
              topic_name: "Deadlocks",
              subject_name: "Operating Systems",
              weakness_score: 66,
              mastery_level: "Moderate",
              accuracy: 0.55,
              total_attempts: 6,
            },
            {
              topic_id: "t3",
              topic_name: "Pipelining",
              subject_name: "Computer Architecture",
              weakness_score: 62,
              mastery_level: "Moderate",
              accuracy: 0.58,
              total_attempts: 10,
            },
          ],
          strongest_topics: [
            {
              topic_id: "s1",
              topic_name: "IP Addressing",
              subject_name: "Computer Networks",
              weakness_score: 15,
              mastery_level: "Strong",
              accuracy: 0.89,
              total_attempts: 12,
            },
          ],
          subjects_progress: [
            {
              subject_name: "Operating Systems",
              accuracy: 0.58,
            },
            {
              subject_name: "Computer Networks",
              accuracy: 0.76,
            },
          ],
          recent_scores: [],
          todays_quiz_ready: true,
          study_streak_days: 4,
          minutes_studied_today: 95,
          questions_solved_today: 18,
          activity_events_today: 3,
          questions_solved_total: 124,
          hours_studied_total: 31.5,
          roadmap_progress: {
            has_roadmap: true,
            progress_pct: 42,
            current_week: 2,
            total_weeks: 8,
            completed_weeks: 3,
            planned_minutes_total: 2240,
            completed_minutes_total: 940,
          },
          roadmap_progress_pct: 42,
          roadmap_current_week: 2,
          today_plan_status: "active",
          planner_summary: {
            has_plan: true,
            plan_id: "planner-1",
            status: "active",
            total_tasks: 5,
            completed_tasks: 2,
            pending_tasks: 3,
            completion_pct: 40,
            total_planned_minutes: 240,
            total_completed_minutes: 95,
            roadmap_week_number: 2,
            roadmap_focus_label: "Close weak OS areas",
            has_carry_forward: false,
          },
          topic_progress: [
            {
              topic_id: "t1",
              topic_name: "CPU Scheduling",
              subject_name: "Operating Systems",
              mastery_level: "Weak",
              weakness_score: 78,
              accuracy_pct: 42,
              total_attempts: 8,
              planned_minutes: 120,
              completed_minutes: 50,
            },
          ],
          quick_actions: [
            {
              label: "Continue Today's Planner",
              href: "/planner",
              description: "Complete today's scheduled study tasks.",
              variant: "primary",
            },
            {
              label: "Take Adaptive Quiz",
              href: "/quiz/adaptive",
              description: "Reinforce weak topics.",
              variant: "success",
            },
          ],
          nlp_insight:
            "You lose marks on scheduling policy trade-offs. Do a 30-minute FCFS vs SJF comparison drill.",
        }),
      });
    });

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Student Dashboard" })
    ).toBeVisible();
    await expect(page.getByText("CPU Scheduling").first()).toBeVisible();
    await expect(page.getByText("Operating Systems").first()).toBeVisible();
    await expect(page.getByText("AI Insight")).toBeVisible();
    await expect(page.getByText("Questions Solved (Total)")).toBeVisible();
    await expect(page.getByText("Roadmap Progress").first()).toBeVisible();
    await expect(page.getByText("Continue Today's Planner")).toBeVisible();
  });
});
