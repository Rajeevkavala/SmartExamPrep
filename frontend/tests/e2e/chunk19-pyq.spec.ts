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
      name: "token",
      value: "playwright-token",
      url: appUrl,
    },
  ]);

  await page.addInitScript(
    (profile) => {
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
    },
    {
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
    }
  );
};

test.describe("Chunk 19 PYQ browser flow", () => {
  test("student can browse PYQs, launch practice, submit, and see PYQ-aware result", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    let browseFilterSeen = false;
    let submitPayloadSeen = false;

    const browseQuestions = [
      {
        id: "pyq-1",
        subject_id: "subject-os",
        subject_name: "Operating Systems",
        topic_id: "topic-cpu",
        topic_name: "CPU Scheduling",
        subtopic: "Round Robin",
        difficulty: "medium",
        year: 2023,
        source_url: "https://example.com/pyq/os-1",
        question_text: "Which scheduler can starve low-priority jobs?",
      },
      {
        id: "pyq-2",
        subject_id: "subject-dbms",
        subject_name: "DBMS",
        topic_id: "topic-norm",
        topic_name: "Normalization",
        subtopic: "BCNF",
        difficulty: "easy",
        year: 2021,
        source_url: "https://example.com/pyq/dbms-1",
        question_text: "What does BCNF improve over 3NF?",
      },
    ];

    await page.route("**/api/pyq/filters", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          years: [2024, 2023, 2022, 2021],
          subjects: [
            { id: "subject-os", name: "Operating Systems" },
            { id: "subject-dbms", name: "DBMS" },
          ],
          topics: [
            { id: "topic-cpu", subject_id: "subject-os", name: "CPU Scheduling" },
            { id: "topic-deadlock", subject_id: "subject-os", name: "Deadlocks" },
            { id: "topic-norm", subject_id: "subject-dbms", name: "Normalization" },
          ],
          difficulties: ["easy", "medium", "hard"],
        }),
      });
    });

    await page.route("**/api/pyq/questions**", async (route) => {
      const url = new URL(route.request().url());
      let result = [...browseQuestions];

      const subjectId = url.searchParams.get("subject_id");
      const topicId = url.searchParams.get("topic_id");
      const difficulty = url.searchParams.get("difficulty");

      if (subjectId) {
        result = result.filter((question) => question.subject_id === subjectId);
      }
      if (topicId) {
        result = result.filter((question) => question.topic_id === topicId);
      }
      if (difficulty) {
        result = result.filter((question) => question.difficulty === difficulty);
      }

      if (subjectId === "subject-os" && topicId === "topic-cpu" && difficulty === "medium") {
        browseFilterSeen = true;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: result.length,
          limit: Number(url.searchParams.get("limit") ?? 50),
          offset: Number(url.searchParams.get("offset") ?? 0),
          questions: result,
          applied_filters: {},
        }),
      });
    });

    await page.route("**/api/pyq/practice", async (route) => {
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
        subject_id?: string;
        topic_id?: string;
        difficulty?: string;
      };

      expect(payload.subject_id).toBe("subject-os");
      expect(payload.topic_id).toBe("topic-cpu");
      expect(payload.difficulty).toBe("medium");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 2,
          questions: [
            {
              id: "pyq-1",
              question_text: "Which scheduler can starve low-priority jobs?",
              options: ["A. FCFS", "B. Priority", "C. Round Robin", "D. Lottery"],
              question_image_urls: [],
              difficulty: "medium",
              subject_name: "Operating Systems",
              topic_name: "CPU Scheduling",
              subtopic: "Round Robin",
            },
            {
              id: "pyq-3",
              question_text: "What is the main trade-off in priority scheduling?",
              options: ["A. Fairness", "B. Starvation", "C. Throughput", "D. Deadlock"],
              question_image_urls: [],
              difficulty: "medium",
              subject_name: "Operating Systems",
              topic_name: "CPU Scheduling",
              subtopic: "Priority",
            },
          ],
          context_payload: {
            source: "pyq_browser",
            filters: {
              subject_id: "subject-os",
              subject_name: "Operating Systems",
              topic_id: "topic-cpu",
              topic_name: "CPU Scheduling",
              difficulty: "medium",
              year_from: 2022,
            },
          },
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
        answers: Array<{ question_id: string; selected_answer: string }>;
        context_payload?: { source?: string; filters?: { topic_name?: string } } | null;
      };

      expect(payload.quiz_type).toBe("pyq_practice");
      expect(payload.answers).toHaveLength(2);
      expect(payload.context_payload?.source).toBe("pyq_browser");
      expect(payload.context_payload?.filters?.topic_name).toBe("CPU Scheduling");
      submitPayloadSeen = true;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          attempt_id: "attempt-pyq-1",
          quiz_type: "pyq_practice",
          score: 85,
          correct_count: 2,
          total_questions: 2,
          topic_scores: {
            "CPU Scheduling": 85,
          },
          topic_comparisons: [],
          readiness_before: 51,
          readiness_after: 58,
          context_payload: {
            source: "pyq_browser",
            filters: {
              subject_name: "Operating Systems",
              topic_name: "CPU Scheduling",
              difficulty: "medium",
              year_from: 2022,
            },
          },
        }),
      });
    });

    await page.goto("/pyq");

    await expect(page.getByRole("heading", { name: "PYQ Browser" })).toBeVisible();
    await expect(page.getByText("Which scheduler can starve low-priority jobs?")).toBeVisible();

    await page.getByLabel("Subject").selectOption("subject-os");
    await page.getByLabel("Topic").selectOption("topic-cpu");
    await page.getByLabel("Difficulty").selectOption("medium");
    await page.getByLabel("Year from").selectOption("2022");
    await page.getByRole("button", { name: "Apply Filters" }).click();

    await expect.poll(() => browseFilterSeen).toBeTruthy();

    await page.getByRole("button", { name: "Start PYQ Practice" }).click();

    await expect(page.getByRole("heading", { name: "PYQ Practice Session" })).toBeVisible();
    await expect(page.getByText("Subject: Operating Systems")).toBeVisible();
    await expect(page.getByText("Topic: CPU Scheduling")).toBeVisible();

    await page.getByRole("button", { name: /B\. Priority/ }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: /B\. Starvation/ }).click();
    await page.getByRole("button", { name: "Submit PYQ Practice" }).click();

    await expect.poll(() => submitPayloadSeen).toBeTruthy();
    await expect(page).toHaveURL(/\/quiz\/result\/attempt-pyq-1/);
    await expect(page.getByRole("heading", { name: "PYQ Practice Result" })).toBeVisible();
    await expect(page.getByText("Back to PYQ Browser")).toBeVisible();
    await expect(page.getByText("Subject: Operating Systems")).toBeVisible();
  });
});
