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

test.describe("Chunk 13 admin panel", () => {
  test("admin dashboard renders stat cards and unverified alert", async ({
    baseURL,
    context,
    page,
  }) => {
    await setAdminAuth(page, context, baseURL);

    await page.route("**/api/admin/questions/**", async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill(corsPreflightResponse);
        return;
      }

      const url = new URL(request.url());
      const isUnverified = url.searchParams.get("is_verified") === "false";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": "*",
        },
        body: JSON.stringify({
          total: isUnverified ? 7 : 84,
          questions: [],
        }),
      });
    });

    await page.route("**/api/admin/content/subjects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "s1", name: "Operating Systems", topic_count: 5, display_order: 0 },
          { id: "s2", name: "Computer Networks", topic_count: 4, display_order: 1 },
          { id: "s3", name: "DBMS", topic_count: 3, display_order: 2 },
        ]),
      });
    });

    await page.route("**/api/admin/scraper/jobs**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "j1" },
          { id: "j2" },
          { id: "j3" },
          { id: "j4" },
        ]),
      });
    });

    await page.route("**/api/admin/syllabus/uploads**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: "u1" }, { id: "u2" }]),
      });
    });

    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    await expect(page.getByText("Total Questions")).toBeVisible();
    await expect(page.getByText("84").first()).toBeVisible();
    await expect(page.getByText("Unverified", { exact: true })).toBeVisible();
    await expect(page.getByText("7 scraped questions need verification")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Review unverified questions" })
    ).toHaveAttribute("href", "/admin/questions?is_verified=false");

    await expect(page.getByText("Scrape Jobs")).toBeVisible();
    await expect(page.getByText("PDF Uploads")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Scraper" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Syllabus Upload" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open Questions Manager" })
    ).toBeVisible();
  });

  test("subjects manager supports accordion and CRUD interactions", async ({
    baseURL,
    context,
    page,
  }) => {
    await setAdminAuth(page, context, baseURL);

    let subjectCounter = 2;
    let topicCounter = 2;

    const subjects: Array<{
      id: string;
      name: string;
      description: string | null;
      display_order: number;
      topic_count: number;
    }> = [
      {
        id: "s1",
        name: "Operating Systems",
        description: "Core OS concepts",
        display_order: 0,
        topic_count: 1,
      },
    ];

    const topicsBySubject: Record<
      string,
      Array<{
        id: string;
        subject_id: string;
        name: string;
        subtopics: string[];
        nlp_keyword_tags: string[];
        display_order: number;
        difficulty_weight: number;
      }>
    > = {
      s1: [
        {
          id: "t1",
          subject_id: "s1",
          name: "CPU Scheduling",
          subtopics: ["FCFS", "SJF"],
          nlp_keyword_tags: ["throughput"],
          display_order: 0,
          difficulty_weight: 1,
        },
      ],
    };

    await page.route("**/api/admin/questions/**", async (route) => {
      if (route.request().method() === "OPTIONS") {
        await route.fulfill(corsPreflightResponse);
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total: 3,
          questions: [],
        }),
      });
    });

    await page.route("**/api/admin/content/**", async (route) => {
      const request = route.request();
      const method = request.method();

      if (method === "OPTIONS") {
        await route.fulfill(corsPreflightResponse);
        return;
      }

      const url = new URL(request.url());
      const segments = url.pathname.split("/").filter(Boolean);

      if (method === "GET" && segments.join("/") === "api/admin/content/subjects") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(subjects),
        });
        return;
      }

      if (
        method === "POST" &&
        segments.join("/") === "api/admin/content/subjects"
      ) {
        const payload = request.postDataJSON() as {
          name: string;
          description?: string;
          display_order?: number;
        };

        const created = {
          id: `s${subjectCounter++}`,
          name: payload.name,
          description: payload.description ?? null,
          display_order: payload.display_order ?? 0,
          topic_count: 0,
        };

        subjects.push(created);
        topicsBySubject[created.id] = [];

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        });
        return;
      }

      if (
        method === "PUT" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "content" &&
        segments[3] === "subjects" &&
        segments.length === 5
      ) {
        const subjectId = segments[4];
        const payload = request.postDataJSON() as {
          name?: string;
        };

        const subject = subjects.find((item) => item.id === subjectId);
        if (subject && payload.name) {
          subject.name = payload.name;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(subject),
        });
        return;
      }

      if (
        method === "DELETE" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "content" &&
        segments[3] === "subjects" &&
        segments.length === 5
      ) {
        const subjectId = segments[4];
        const subjectIndex = subjects.findIndex((item) => item.id === subjectId);
        if (subjectIndex >= 0) {
          subjects.splice(subjectIndex, 1);
          delete topicsBySubject[subjectId];
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ deleted: true, subject_id: subjectId }),
        });
        return;
      }

      if (
        method === "GET" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "content" &&
        segments[3] === "subjects" &&
        segments[5] === "topics"
      ) {
        const subjectId = segments[4];

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(topicsBySubject[subjectId] || []),
        });
        return;
      }

      if (
        method === "POST" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "content" &&
        segments[3] === "subjects" &&
        segments[5] === "topics"
      ) {
        const subjectId = segments[4];
        const payload = request.postDataJSON() as {
          name: string;
          subtopics: string[];
          nlp_keyword_tags: string[];
          display_order?: number;
          difficulty_weight?: number;
        };

        const created = {
          id: `t${topicCounter++}`,
          subject_id: subjectId,
          name: payload.name,
          subtopics: payload.subtopics ?? [],
          nlp_keyword_tags: payload.nlp_keyword_tags ?? [],
          display_order: payload.display_order ?? 0,
          difficulty_weight: payload.difficulty_weight ?? 1,
        };

        topicsBySubject[subjectId] = [...(topicsBySubject[subjectId] || []), created];

        const subject = subjects.find((item) => item.id === subjectId);
        if (subject) {
          subject.topic_count = topicsBySubject[subjectId].length;
        }

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        });
        return;
      }

      if (
        method === "PUT" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "content" &&
        segments[3] === "topics" &&
        segments.length === 5
      ) {
        const topicId = segments[4];
        const payload = request.postDataJSON() as {
          name?: string;
          subtopics?: string[];
          nlp_keyword_tags?: string[];
          display_order?: number;
          difficulty_weight?: number;
        };

        let updatedTopic: (typeof topicsBySubject)[string][number] | null = null;

        Object.values(topicsBySubject).forEach((topicList) => {
          const match = topicList.find((topic) => topic.id === topicId);
          if (match) {
            if (payload.name) {
              match.name = payload.name;
            }
            if (payload.subtopics) {
              match.subtopics = payload.subtopics;
            }
            if (payload.nlp_keyword_tags) {
              match.nlp_keyword_tags = payload.nlp_keyword_tags;
            }
            if (typeof payload.display_order === "number") {
              match.display_order = payload.display_order;
            }
            if (typeof payload.difficulty_weight === "number") {
              match.difficulty_weight = payload.difficulty_weight;
            }
            updatedTopic = match;
          }
        });

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updatedTopic),
        });
        return;
      }

      if (
        method === "DELETE" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "content" &&
        segments[3] === "topics" &&
        segments.length === 5
      ) {
        const topicId = segments[4];

        Object.entries(topicsBySubject).forEach(([subjectId, topicList]) => {
          const next = topicList.filter((topic) => topic.id !== topicId);
          topicsBySubject[subjectId] = next;

          const subject = subjects.find((item) => item.id === subjectId);
          if (subject) {
            subject.topic_count = next.length;
          }
        });

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ deleted: true, topic_id: topicId }),
        });
        return;
      }

      await route.abort();
    });

    await page.goto("/admin/subjects");

    await expect(page.getByRole("heading", { name: "Subjects Manager" })).toBeVisible();

    await page.getByText("Operating Systems", { exact: true }).click();
    await expect(page.getByText("CPU Scheduling")).toBeVisible();

    await page.getByRole("button", { name: "Add Subject" }).click();
    await page.getByLabel("Subject Name").fill("Computer Networks");
    await page.getByLabel("Description").fill("CN syllabus");
    await page.getByLabel("Display Order").fill("2");
    await page.getByRole("button", { name: "Save Subject" }).click();

    await expect(page.getByText("Computer Networks", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: "Edit Operating Systems", exact: true })
      .click();
    await page.getByLabel("Edit subject name").fill("Operating Systems & Processes");
    await page
      .getByRole("button", { name: "Save subject name", exact: true })
      .click();

    await expect(
      page.getByText("Operating Systems & Processes", { exact: true })
    ).toBeVisible();

    await page.getByText("Computer Networks", { exact: true }).click();
    await page
      .getByRole("button", { name: "Add Topic to Computer Networks" })
      .click();

    await page.getByLabel("Topic Name").fill("Routing");
    await page
      .getByPlaceholder("Add subtopic and press Enter")
      .fill("Distance Vector");
    await page.getByPlaceholder("Add subtopic and press Enter").press("Enter");
    await page.getByRole("button", { name: "Save Topic" }).click();

    await expect(page.getByText("Routing", { exact: true })).toBeVisible();
    await expect(page.getByText("1 subtopics", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Edit topic Routing" }).click();
    await page.getByLabel("Topic Name").fill("Network Routing");
    await page.getByRole("button", { name: "Save Topic" }).click();

    await expect(page.getByText("Network Routing", { exact: true })).toBeVisible();

    await page
      .getByRole("button", { name: "Delete topic Network Routing" })
      .click();
    await page.getByRole("button", { name: "Delete Topic" }).click();

    await expect(page.getByText("Network Routing", { exact: true })).toHaveCount(0);
  });
});
