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

type MockUploadStatus = "pending" | "processing" | "done" | "failed";

type MockUpload = {
  upload_id: string;
  filename: string;
  status: MockUploadStatus;
  extracted_structure: {
    subjects: Array<{
      name: string;
      topics: Array<{
        name: string;
        subtopics: string[];
      }>;
    }>;
  } | null;
  subjects_imported: number;
  topics_imported: number;
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

test.describe("Chunk 16 admin syllabus upload", () => {
  test("supports PDF upload, polling, tree preview, import, and past uploads list", async ({
    baseURL,
    context,
    page,
  }) => {
    await setAdminAuth(page, context, baseURL);

    const extractedStructure = {
      subjects: [
        {
          name: "Operating Systems",
          topics: [
            {
              name: "CPU Scheduling",
              subtopics: ["FCFS", "SJF", "Round Robin"],
            },
            {
              name: "Memory Management",
              subtopics: ["Paging", "Segmentation"],
            },
          ],
        },
        {
          name: "DBMS",
          topics: [
            {
              name: "Normalization",
              subtopics: ["1NF", "2NF", "3NF"],
            },
          ],
        },
      ],
    };

    const uploadsById: Record<string, MockUpload> = {
      "upload-done-1": {
        upload_id: "upload-done-1",
        filename: "previous-gate-cse.pdf",
        status: "done",
        extracted_structure: extractedStructure,
        subjects_imported: 1,
        topics_imported: 2,
        error_message: null,
        created_at: "2026-04-04T09:00:00Z",
      },
      "upload-failed-1": {
        upload_id: "upload-failed-1",
        filename: "failed-gate-syllabus.pdf",
        status: "failed",
        extracted_structure: null,
        subjects_imported: 0,
        topics_imported: 0,
        error_message: "PDF parse failed: malformed document.",
        created_at: "2026-04-04T08:00:00Z",
      },
    };

    const startedUploadId = "upload-new-1";
    let startedPollCount = 0;

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
          body: JSON.stringify({ total: 3, questions: [] }),
        });
        return;
      }

      if (path === "/api/admin/syllabus/uploads" && method === "GET") {
        const uploads = Object.values(uploadsById).sort((first, second) =>
          first.created_at < second.created_at ? 1 : -1
        );

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(uploads),
        });
        return;
      }

      if (path === "/api/admin/syllabus/upload" && method === "POST") {
        uploadsById[startedUploadId] = {
          upload_id: startedUploadId,
          filename: "gate-cse-2026.pdf",
          status: "pending",
          extracted_structure: null,
          subjects_imported: 0,
          topics_imported: 0,
          error_message: null,
          created_at: "2026-04-04T10:00:00Z",
        };
        startedPollCount = 0;

        await route.fulfill({
          status: 202,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({
            upload_id: startedUploadId,
            status: "pending",
          }),
        });
        return;
      }

      if (
        method === "GET" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "syllabus" &&
        segments[3] === "uploads" &&
        segments.length === 5
      ) {
        const uploadId = segments[4];
        const upload = uploadsById[uploadId];

        if (!upload) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ detail: "Upload not found." }),
          });
          return;
        }

        if (uploadId === startedUploadId) {
          startedPollCount += 1;

          if (startedPollCount === 1) {
            upload.status = "processing";
            upload.extracted_structure = null;
          } else {
            upload.status = "done";
            upload.extracted_structure = extractedStructure;
            upload.error_message = null;
          }
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify(upload),
        });
        return;
      }

      if (
        method === "POST" &&
        segments[0] === "api" &&
        segments[1] === "admin" &&
        segments[2] === "syllabus" &&
        segments[3] === "uploads" &&
        segments[5] === "import"
      ) {
        const uploadId = segments[4];
        const upload = uploadsById[uploadId];

        if (!upload) {
          await route.fulfill({
            status: 404,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ detail: "Upload not found." }),
          });
          return;
        }

        upload.subjects_imported += 2;
        upload.topics_imported += 5;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({
            subjects_created: 2,
            topics_created: 5,
          }),
        });
        return;
      }

      await route.abort();
    });

    await page.goto("/admin/syllabus");

    await expect(page.getByRole("heading", { name: "Syllabus Upload" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Past Uploads" })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "previous-gate-cse.pdf", exact: true })
    ).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: "gate-cse-2026.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"),
    });

    await expect(page.getByText("Selected: gate-cse-2026.pdf")).toBeVisible();
    await page.getByRole("button", { name: "Upload & Extract" }).click();

    await expect(page.getByText("Polling every 2s")).toBeVisible();
    await expect(page.getByText("Operating Systems")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("3 topics")).toBeVisible();
    await expect(page.getByText("Round Robin")).toBeVisible();

    await page.getByRole("button", { name: "Import to Database" }).click();
    await expect(
      page.getByText("Imported so far: 2 subjects • 5 topics")
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: "View syllabus upload failed-gate-syllabus.pdf",
      })
      .click();

    await expect(page.getByText("PDF parse failed: malformed document.")).toBeVisible();
  });
});
