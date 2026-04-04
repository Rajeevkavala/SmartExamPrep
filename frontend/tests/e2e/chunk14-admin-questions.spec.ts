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

type MockQuestion = {
  id: string;
  subject_id: string;
  topic_id: string;
  subject_name: string;
  topic_name: string;
  subtopic: string | null;
  question_text: string;
  options: string[];
  question_image_urls: string[];
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  source_type: "PYQ" | "practice" | "scraped";
  source_url: string | null;
  year: number | null;
  nlp_keyword_tags: string[];
  is_verified: boolean;
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
      name: "token",
      value: token,
      url: appUrl,
    },
  ]);

  await page.addInitScript((authToken: string) => {
    localStorage.setItem("token", authToken);
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

const setupAdminQuestionMocks = async (
  page: import("@playwright/test").Page
) => {
  const subjectOsId = "11111111-1111-4111-8111-111111111111";
  const subjectDbId = "22222222-2222-4222-8222-222222222222";
  const topicCpuId = "33333333-3333-4333-8333-333333333333";
  const topicDeadlockId = "44444444-4444-4444-8444-444444444444";
  const topicNormId = "55555555-5555-4555-8555-555555555555";

  const subjects = [
    { id: subjectOsId, name: "Operating Systems" },
    { id: subjectDbId, name: "DBMS" },
  ];

  const topicsBySubject: Record<string, Array<{ id: string; subject_id: string; name: string }>> = {
    [subjectOsId]: [
      { id: topicCpuId, subject_id: subjectOsId, name: "CPU Scheduling" },
      { id: topicDeadlockId, subject_id: subjectOsId, name: "Deadlocks" },
    ],
    [subjectDbId]: [
      { id: topicNormId, subject_id: subjectDbId, name: "Normalization" },
    ],
  };

  let questionCounter = 3;

  const questions: MockQuestion[] = [
    {
      id: "q1",
      subject_id: subjectOsId,
      topic_id: topicCpuId,
      subject_name: "Operating Systems",
      topic_name: "CPU Scheduling",
      subtopic: "Round Robin",
      question_text: "What is Round Robin scheduling?",
      options: ["A. Preemptive", "B. Non-preemptive", "C. Static", "D. None"],
      question_image_urls: [],
      correct_answer: "A",
      explanation: "Round Robin uses time quantum and is preemptive.",
      difficulty: "easy",
      source_type: "practice",
      source_url: null,
      year: null,
      nlp_keyword_tags: ["scheduling", "quantum"],
      is_verified: true,
    },
    {
      id: "q2",
      subject_id: subjectOsId,
      topic_id: topicDeadlockId,
      subject_name: "Operating Systems",
      topic_name: "Deadlocks",
      subtopic: "Prevention",
      question_text: "What is deadlock prevention?",
      options: ["A. Hold and wait", "B. Circular wait", "C. Mutual exclusion", "D. Prevention strategy"],
      question_image_urls: ["https://example.com/deadlock.png"],
      correct_answer: "D",
      explanation: "Deadlock prevention denies at least one Coffman condition.",
      difficulty: "hard",
      source_type: "PYQ",
      source_url: null,
      year: 2021,
      nlp_keyword_tags: ["deadlock", "os"],
      is_verified: false,
    },
  ];

  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill(corsPreflightResponse);
      return;
    }

    const url = new URL(request.url());
    const path = url.pathname;
    const segments = path.split("/").filter(Boolean);

    if (path === "/api/admin/content/subjects" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(subjects),
      });
      return;
    }

    if (
      segments[0] === "api" &&
      segments[1] === "admin" &&
      segments[2] === "content" &&
      segments[3] === "subjects" &&
      segments[5] === "topics" &&
      request.method() === "GET"
    ) {
      const subjectId = segments[4];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(topicsBySubject[subjectId] || []),
      });
      return;
    }

    if (path === "/api/admin/questions/" && request.method() === "GET") {
      let result = [...questions];

      const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
      const difficulty = (url.searchParams.get("difficulty") ?? "").trim().toLowerCase();
      const sourceType = (url.searchParams.get("source_type") ?? "").trim().toLowerCase();
      const isVerified = url.searchParams.get("is_verified");
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const offset = Number(url.searchParams.get("offset") ?? 0);

      if (search) {
        result = result.filter((question) =>
          question.question_text.toLowerCase().includes(search)
        );
      }

      if (difficulty) {
        result = result.filter(
          (question) => question.difficulty.toLowerCase() === difficulty
        );
      }

      if (sourceType) {
        result = result.filter(
          (question) => question.source_type.toLowerCase() === sourceType
        );
      }

      if (isVerified === "true" || isVerified === "false") {
        result = result.filter(
          (question) => String(question.is_verified) === isVerified
        );
      }

      const total = result.length;
      const paginated = result.slice(offset, offset + limit);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ total, limit, offset, questions: paginated }),
      });
      return;
    }

    if (path === "/api/admin/questions/bulk-verify" && request.method() === "POST") {
      const payload = request.postDataJSON() as { question_ids?: string[] };
      const ids = payload.question_ids ?? [];
      questions.forEach((question) => {
        if (ids.includes(question.id)) {
          question.is_verified = true;
        }
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ verified_count: ids.length, requested_count: ids.length }),
      });
      return;
    }

    if (path === "/api/admin/questions/" && request.method() === "POST") {
      const payload = request.postDataJSON() as Omit<MockQuestion, "id" | "subject_name" | "topic_name" | "is_verified" | "nlp_keyword_tags">;
      const subjectName =
        subjects.find((subject) => subject.id === payload.subject_id)?.name ??
        "Unknown Subject";
      const topicName =
        topicsBySubject[payload.subject_id]?.find((topic) => topic.id === payload.topic_id)
          ?.name ?? "Unknown Topic";

      const created: MockQuestion = {
        id: `q${questionCounter++}`,
        subject_id: payload.subject_id,
        topic_id: payload.topic_id,
        subject_name: subjectName,
        topic_name: topicName,
        subtopic: payload.subtopic ?? null,
        question_text: payload.question_text,
        options: payload.options,
        question_image_urls: payload.question_image_urls ?? [],
        correct_answer: payload.correct_answer,
        explanation: payload.explanation ?? "",
        difficulty: payload.difficulty,
        source_type: payload.source_type,
        source_url: payload.source_url ?? null,
        year: payload.year ?? null,
        nlp_keyword_tags: [],
        is_verified: true,
      };

      questions.unshift(created);

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(created),
      });
      return;
    }

    if (
      segments[0] === "api" &&
      segments[1] === "admin" &&
      segments[2] === "questions" &&
      segments.length === 4 &&
      request.method() === "GET"
    ) {
      const question = questions.find((item) => item.id === segments[3]);

      if (!question) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ detail: "Question not found" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(question),
      });
      return;
    }

    if (
      segments[0] === "api" &&
      segments[1] === "admin" &&
      segments[2] === "questions" &&
      segments.length === 4 &&
      request.method() === "PUT"
    ) {
      const payload = request.postDataJSON() as Partial<MockQuestion>;
      const question = questions.find((item) => item.id === segments[3]);

      if (!question) {
        await route.fulfill({ status: 404, body: JSON.stringify({ detail: "Not found" }) });
        return;
      }

      Object.assign(question, payload);

      if (payload.subject_id) {
        question.subject_name =
          subjects.find((subject) => subject.id === payload.subject_id)?.name ??
          question.subject_name;
      }

      if (payload.topic_id && payload.subject_id) {
        question.topic_name =
          topicsBySubject[payload.subject_id]?.find((topic) => topic.id === payload.topic_id)
            ?.name ?? question.topic_name;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(question),
      });
      return;
    }

    if (
      segments[0] === "api" &&
      segments[1] === "admin" &&
      segments[2] === "questions" &&
      segments[4] === "verify" &&
      request.method() === "POST"
    ) {
      const question = questions.find((item) => item.id === segments[3]);
      if (question) {
        question.is_verified = true;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ verified: true, question_id: segments[3] }),
      });
      return;
    }

    if (
      segments[0] === "api" &&
      segments[1] === "admin" &&
      segments[2] === "questions" &&
      segments.length === 4 &&
      request.method() === "DELETE"
    ) {
      const index = questions.findIndex((question) => question.id === segments[3]);
      if (index >= 0) {
        questions.splice(index, 1);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ deleted: true, question_id: segments[3] }),
      });
      return;
    }

    await route.abort();
  });
};

test.describe("Chunk 14 admin questions", () => {
  test("questions manager supports filtering, bulk verify, create modal, and delete", async ({
    baseURL,
    context,
    page,
  }) => {
    await setAdminAuth(page, context, baseURL);
    await setupAdminQuestionMocks(page);

    await page.goto("/admin/questions");

    await expect(page.getByRole("heading", { name: "Questions Manager" })).toBeVisible();
    await expect(page.getByText("What is Round Robin scheduling?")).toBeVisible();

    await page.getByRole("button", { name: "hard" }).click();
    await expect(page.getByText("What is deadlock prevention?")).toBeVisible();
    await expect(page.getByText("What is Round Robin scheduling?")).toHaveCount(0);

    await page.getByLabel("Select question q2").check();
    await expect(page.getByRole("button", { name: "Verify 1 selected" })).toBeVisible();
    await page.getByRole("button", { name: "Verify 1 selected" }).click();
    await expect(page.locator("tbody").getByText("Verified").first()).toBeVisible();

    await page.getByRole("button", { name: "Add Question" }).click();
    await expect(page.getByRole("heading", { name: "Add Question" })).toBeVisible();

    await page
      .locator("#subject_id")
      .selectOption("11111111-1111-4111-8111-111111111111");
    await expect(page.locator("#topic_id")).toBeEnabled();
    await page
      .locator("#topic_id")
      .selectOption("33333333-3333-4333-8333-333333333333");
    await page
      .getByLabel("Question Text")
      .fill("Newly created hard practice question from modal");
    await page.getByLabel("Option A").fill("A. Option one");
    await page.getByLabel("Option B").fill("B. Option two");
    await page.getByLabel("Option C").fill("C. Option three");
    await page.getByLabel("Option D").fill("D. Option four");
    await page.locator("#correct_answer").selectOption("B");
    await page.locator("#difficulty").selectOption("hard");
    await page.locator("#source_type").selectOption("practice");
    await page.getByLabel("Explanation").fill("Modal save flow explanation.");

    await page.getByRole("button", { name: "Add Image URL" }).click();
    await page
      .getByPlaceholder("https://example.com/question-image.png")
      .first()
      .fill("https://example.com/new-question.png");

    await page.getByRole("button", { name: "Save Question" }).click();

    await expect(page.getByRole("heading", { name: "Add Question" })).toHaveCount(0, {
      timeout: 10000,
    });
    await expect(
      page.getByText("Newly created hard practice question from modal")
    ).toBeVisible();

    const createdRow = page.locator("tr", {
      has: page.getByText("Newly created hard practice question from modal"),
    });

    await createdRow.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete Question" }).click();

    await expect(
      page.getByText("Newly created hard practice question from modal")
    ).toHaveCount(0);
  });

  test("question detail page supports verify, preview, and save", async ({
    baseURL,
    context,
    page,
  }) => {
    await setAdminAuth(page, context, baseURL);
    await setupAdminQuestionMocks(page);

    await page.goto("/admin/questions/q2");

    await expect(page.getByRole("heading", { name: "Question Detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student Preview" })).toBeVisible();
    await expect(page.getByText("deadlock", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Verify Question" }).click();
    await expect(page.getByText("Verified")).toBeVisible();

    await page
      .getByLabel("Question Text")
      .fill("Updated hard question text for preview sync");
    await page.getByLabel("Option A").fill("A. Updated option A text");
    await page.getByLabel("Option B").fill("B. Updated option B text");
    await page.getByLabel("Option C").fill("C. Updated option C text");
    await page.getByLabel("Option D").fill("D. Updated option D text");

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(
      page.getByText("Updated hard question text for preview sync")
    ).toBeVisible();
  });
});
