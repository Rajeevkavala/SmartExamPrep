import { expect, test } from "@playwright/test";

const futureExamDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const setStudentAuth = async (
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
  baseURL: string | undefined
) => {
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
  }, {
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
        confidence_pct: 75,
      },
    ],
    known_topic_ids: ["topic-cpu"],
  });
};

test.describe("Chunk 12 quiz and revision flows", () => {
  test("diagnostic quiz submits and renders result comparison", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    let weaknessCallCount = 0;

    await page.route("**/api/quiz/diagnostic", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 2,
          questions: [
            {
              id: "q-1",
              question_text: "Which scheduling algorithm can cause starvation?",
              options: [
                "A. FCFS",
                "B. Round Robin",
                "C. Priority Scheduling",
                "D. EDF",
              ],
              question_image_urls: [
                "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=1200",
              ],
              difficulty: "medium",
              subject_name: "Operating Systems",
              topic_name: "CPU Scheduling",
              subtopic: "Priority",
            },
            {
              id: "q-2",
              question_text: "What is the worst-case time complexity of quicksort?",
              options: [
                "A. O(n log n)",
                "B. O(log n)",
                "C. O(n)",
                "D. O(n^2)",
              ],
              question_image_urls: [],
              difficulty: "easy",
              subject_name: "Algorithms",
              topic_name: "Sorting",
              subtopic: "Quick Sort",
            },
          ],
        }),
      });
    });

    await page.route("**/api/analysis/weakness", async (route) => {
      weaknessCallCount += 1;

      if (weaknessCallCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              topic_id: "topic-cpu",
              topic_name: "CPU Scheduling",
              subject_name: "Operating Systems",
              weakness_score: 78,
              mastery_level: "Weak",
              accuracy: 0.42,
              total_attempts: 7,
            },
            {
              topic_id: "topic-sorting",
              topic_name: "Sorting",
              subject_name: "Algorithms",
              weakness_score: 62,
              mastery_level: "Moderate",
              accuracy: 0.57,
              total_attempts: 5,
            },
          ]),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            topic_id: "topic-cpu",
            topic_name: "CPU Scheduling",
            subject_name: "Operating Systems",
            weakness_score: 58,
            mastery_level: "Moderate",
            accuracy: 0.63,
            total_attempts: 8,
          },
          {
            topic_id: "topic-sorting",
            topic_name: "Sorting",
            subject_name: "Algorithms",
            weakness_score: 50,
            mastery_level: "Moderate",
            accuracy: 0.64,
            total_attempts: 6,
          },
        ]),
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
        answers: Array<{ question_id: string; selected_answer: string }>;
      };

      expect(payload.quiz_type).toBe("diagnostic");
      expect(payload.answers).toHaveLength(2);
      const submittedQuestionIds = payload.answers
        .map((answer) => answer.question_id)
        .sort();
      expect(submittedQuestionIds).toEqual(["q-1", "q-2"]);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          attempt_id: "attempt-001",
          score: 78.5,
          correct_count: 2,
          total_questions: 2,
          topic_scores: {
            "CPU Scheduling": 100,
            Sorting: 50,
          },
        }),
      });
    });

    await page.goto("/quiz/diagnostic");

    await expect(page.getByRole("heading", { name: "Diagnostic Quiz" })).toBeVisible();
    await page.getByRole("button", { name: /C\. Priority Scheduling/ }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: /D\. O\(n\^2\)/ }).click();
    await page.getByRole("button", { name: "Submit Quiz" }).click();

    await expect(page).toHaveURL(/\/quiz\/result\/attempt-001/);
    await expect(page.getByRole("heading", { name: "Quiz Result" })).toBeVisible();
    await expect(page.getByText("78.5%").first()).toBeVisible();
    await expect(page.getByText("CPU Scheduling").first()).toBeVisible();
    await expect(page.getByText("Per-Topic Performance")).toBeVisible();
    await expect(page.getByText("Weakness Change (Before vs After)")).toBeVisible();
  });

  test("adaptive quiz shows weak topic badges", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    await page.route("**/api/quiz/adaptive", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 1,
          questions: [
            {
              id: "aq-1",
              question_text: "Which layer provides end-to-end process communication?",
              options: [
                "A. Physical",
                "B. Data Link",
                "C. Transport",
                "D. Application",
              ],
              question_image_urls: [],
              difficulty: "medium",
              subject_name: "Computer Networks",
              topic_name: "OSI Model",
              subtopic: "Transport Layer",
            },
          ],
        }),
      });
    });

    await page.route("**/api/analysis/weakness", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            topic_id: "w-1",
            topic_name: "OSI Model",
            subject_name: "Computer Networks",
            weakness_score: 74,
            mastery_level: "Weak",
            accuracy: 0.45,
            total_attempts: 6,
          },
          {
            topic_id: "w-2",
            topic_name: "Routing",
            subject_name: "Computer Networks",
            weakness_score: 68,
            mastery_level: "Moderate",
            accuracy: 0.52,
            total_attempts: 6,
          },
        ]),
      });
    });

    await page.goto("/quiz/adaptive");

    await expect(
      page.getByRole("heading", { name: "Today's AI-Recommended Quiz" })
    ).toBeVisible();
    const weakBadgeRow = page.locator("header").first();
    await expect(weakBadgeRow.getByText("OSI Model", { exact: true })).toBeVisible();
    await expect(weakBadgeRow.getByText("Routing", { exact: true })).toBeVisible();
  });

  test("revision page marks due item as done and refreshes", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    let revisionItems = [
      {
        topic_id: "rev-1",
        topic_name: "Deadlocks",
        subject_name: "Operating Systems",
        due_date: "2026-04-01T08:00:00Z",
        interval_days: 3,
        last_score_pct: 56,
      },
    ];

    await page.route("**/api/revision/plan", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          revision_items: revisionItems,
        }),
      });
    });

    await page.route("**/api/revision/mark-done", async (route) => {
      revisionItems = [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/revision");

    await expect(page.getByRole("heading", { name: "Revision Plan" })).toBeVisible();
    await expect(page.getByText("Deadlocks")).toBeVisible();
    await page.getByRole("button", { name: "Mark Done ✓" }).click();
    await expect(page.getByText("🎉 All caught up!")).toBeVisible();
  });
});
