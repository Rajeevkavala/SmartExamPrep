import { expect, test } from "@playwright/test";

const base64UrlEncode = (payload: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const createUnsignedToken = (role: "student" | "admin") => {
  const header = base64UrlEncode({ alg: "HS256", typ: "JWT" });
  const claims = base64UrlEncode({
    sub: "playwright-user",
    role,
    exp: 4_102_444_800,
  });
  return `${header}.${claims}.signature`;
};

const corsPreflightResponse = {
  status: 204,
  headers: {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "*",
  },
  body: "",
} as const;

type MockExtractedQuestion = {
  subject: string;
  topic: string;
  subtopic: string;
  question_text: string;
  question_image_urls: string[];
  options: string[];
  correct_answer: string;
  explanation: string;
};

type MockScrapeJob = {
  job_id: string;
  url: string;
  status: "pending" | "processing" | "done" | "failed";
  notes: string | null;
  extracted_questions: MockExtractedQuestion[];
  questions_imported: number;
  error_message: string | null;
  created_at: string;
};

const setAdminAuth = async (
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext,
  baseURL: string | undefined
) => {
  const appUrl = baseURL || "http://localhost:3000";
  const token = createUnsignedToken("admin");

  await context.addCookies([
    {
      name: "access_token",
      value: token,
      url: appUrl,
    },
  ]);

  await page.addInitScript((authToken: string) => {
    localStorage.setItem("access_token", authToken);
    localStorage.setItem(
      "auth-store",
      JSON.stringify({
        state: {
          token: authToken,
          role: "admin",
          user: {
            id: "playwright-admin",
            email: "admin@example.com",
          },
        },
        version: 0,
      })
    );
  }, token);
};

test.describe("Chunk 15 admin scraper", () => {
  test("supports scrape start, polling, review, and import", async ({
    baseURL,
    context,
    page,
  }) => {
    await setAdminAuth(page, context, baseURL);

    const doneQuestion: MockExtractedQuestion = {
      subject: "Operating Systems",
      topic: "CPU Scheduling",
      subtopic: "Round Robin",
      question_text: "Which scheduler is preemptive with time quantum?",
      question_image_urls: ["https://example.com/rr-question.png"],
      options: [
        "A. FCFS",
        "B. Round Robin",
        "C. SJF",
        "D. Priority",
      ],
      correct_answer: "B",
      explanation: "Round Robin is preemptive because the running task is rotated.",
    };

    const startedDoneQuestion: MockExtractedQuestion = {
      subject: "DBMS",
      topic: "Normalization",
      subtopic: "3NF",
      question_text: "A relation in 3NF always avoids which issue?",
      question_image_urls: [],
      options: [
        "A. Update anomaly",
        "B. Transaction logs",
        "C. Lock starvation",
        "D. Deadlock",
      ],
      correct_answer: "A",
      explanation: "Normalization helps reduce update anomalies in relational schemas.",
    };

    const jobsById: Record<string, MockScrapeJob> = {
      "job-done-1": {
        job_id: "job-done-1",
        url: "https://example.com/pyq/os-round-robin",
        status: "done",
        notes: null,
        extracted_questions: [doneQuestion],
        questions_imported: 0,
        error_message: null,
        created_at: "2026-04-04T08:15:00Z",
      },
      "job-failed-1": {
        job_id: "job-failed-1",
        url: "https://example.com/unparsable-article",
        status: "failed",
        notes: null,
        extracted_questions: [],
        questions_imported: 0,
        error_message: "No question-like content found.",
        created_at: "2026-04-03T11:40:00Z",
      },
    };

    const startedJobId = "job-new-1";
    const startedJobUrl = "https://example.com/latest/dbms-pyq";
    let startedJobPollCount = 0;

    await page.route("**/api/admin/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill(corsPreflightResponse);
        return;
      }

      const url = new URL(request.url());
      const path = url.pathname;
      const method = request.method();
      const segments = path.split("/").filter(Boolean);

      if (path === "/api/admin/questions/" && method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ total: 4, questions: [] }),
        });
        return;
      }

      if (path === "/api/admin/scraper/jobs" && method === "GET") {
        const jobs = Object.values(jobsById).sort((a, b) =>
          a.created_at < b.created_at ? 1 : -1
        );

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(jobs),
        });
        return;
      }

      if (path === "/api/admin/scraper/start" && method === "POST") {
        jobsById[startedJobId] = {
          job_id: startedJobId,
          url: startedJobUrl,
          status: "pending",
          notes: null,
          extracted_questions: [],
          questions_imported: 0,
          error_message: null,
          created_at: "2026-04-04T10:00:00Z",
        };
        startedJobPollCount = 0;

        await route.fulfill({
          status: 202,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ job_id: startedJobId, status: "pending" }),
        });
        return;
      }

      if (
        method === "GET" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "scraper" &&
        segments[3] === "jobs" &&
        segments.length === 5
      ) {
        const jobId = segments[4];
        const job = jobsById[jobId];

        if (!job) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ detail: "Job not found." }),
          });
          return;
        }

        if (jobId === startedJobId) {
          startedJobPollCount += 1;
          if (startedJobPollCount === 1) {
            job.status = "processing";
            job.extracted_questions = [];
          } else {
            job.status = "done";
            job.extracted_questions = [startedDoneQuestion];
          }
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(job),
        });
        return;
      }

      if (
        method === "POST" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "scraper" &&
        segments[3] === "jobs" &&
        segments[5] === "import"
      ) {
        const jobId = segments[4];
        const job = jobsById[jobId];

        if (!job) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ detail: "Job not found." }),
          });
          return;
        }

        const payload = request.postDataJSON() as { accepted_indices?: number[] };
        const imported = Array.isArray(payload.accepted_indices)
          ? payload.accepted_indices.length
          : 0;

        job.questions_imported += imported;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ imported }),
        });
        return;
      }

      await route.abort();
    });

    await page.goto("/admin/scraper");

    await expect(page.getByRole("heading", { name: "URL Scraper" })).toBeVisible();
    await expect(page.getByText("https://example.com/pyq/os-round-robin")).toBeVisible();

    await page.getByRole("button", { name: /Review scrape job job-done-1/ }).click();
    await expect(page.getByRole("heading", { name: "Active Job Review" })).toBeVisible();
    await expect(
      page.getByText("Operating Systems -> CPU Scheduling -> Round Robin")
    ).toBeVisible();
    await expect(
      page.getByText("Which scheduler is preemptive with time quantum?")
    ).toBeVisible();

    await page.getByRole("button", { name: "Accept ✅" }).click();
    await expect(page.getByRole("button", { name: "Reject ❌" })).toBeVisible();

    await page.getByRole("button", { name: "Import 1 Accepted" }).click();
    await expect(page.getByText("1 imported so far")).toBeVisible();

    await page
      .getByLabel("Scrape source URL")
      .fill("https://example.com/latest/dbms-pyq");
    await page.getByRole("button", { name: "Scrape", exact: true }).click();

    await expect(
      page.getByText("Scraping and structuring with the AI layer...")
    ).toBeVisible();

    await page.getByRole("button", { name: "Refresh Status" }).click();
    await expect(
      page.getByText("A relation in 3NF always avoids which issue?")
    ).toBeVisible();
  });
});
