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
          confidence_pct: 72,
        },
      ],
      known_topic_ids: ["topic-cpu"],
    }
  );
};

test.describe("Chunk 20 study chat", () => {
  test("loads session history and sends a grounded starter prompt", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    let messagePosted = false;

    await page.route("**/api/study-chat/sessions", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-headers": "*",
          },
          body: "",
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessions: [
            {
              session_id: "session-1",
              title: "Roadmap help",
              context_type: "roadmap",
              last_used_at: "2026-04-05T09:00:00Z",
              created_at: "2026-04-05T08:30:00Z",
              updated_at: "2026-04-05T09:00:00Z",
              last_message_preview: "How do I handle weak topics this week?",
              message_count: 0,
            },
          ],
        }),
      });
    });

    await page.route("**/api/study-chat/sessions/session-1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            session_id: "session-1",
            title: "Roadmap help",
            context_type: "roadmap",
            last_used_at: "2026-04-05T09:00:00Z",
            created_at: "2026-04-05T08:30:00Z",
            updated_at: "2026-04-05T09:00:00Z",
            last_message_preview: "How do I handle weak topics this week?",
            message_count: 0,
          },
          messages: [],
        }),
      });
    });

    await page.route("**/api/study-chat/sessions/session-1/messages", async (route) => {
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

      const payload = route.request().postDataJSON() as { message: string };
      expect(payload.message).toContain("weakest topic");
      messagePosted = true;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            session_id: "session-1",
            title: "Roadmap help",
            context_type: "weak_topic",
            last_used_at: "2026-04-05T09:15:00Z",
            created_at: "2026-04-05T08:30:00Z",
            updated_at: "2026-04-05T09:15:00Z",
            last_message_preview: "You are weakest in CPU Scheduling...",
            message_count: 2,
          },
          user_message: {
            id: "msg-user-1",
            role: "user",
            message_text: payload.message,
            grounding_snapshot_json: null,
            created_at: "2026-04-05T09:15:00Z",
          },
          assistant_message: {
            id: "msg-assistant-1",
            role: "assistant",
            message_text:
              "You are weakest in CPU Scheduling. Start with a 30-minute concept review and then solve 10 targeted questions.",
            grounding_snapshot_json: {
              user_profile: {
                daily_study_minutes: 90,
                exam_target_date: futureExamDate,
              },
              weak_topics: [
                {
                  topic_name: "CPU Scheduling",
                  subject_name: "Operating Systems",
                },
              ],
              planner: {
                status: "active",
                pending_tasks: [
                  {
                    title: "Practice CPU Scheduling",
                  },
                ],
              },
              roadmap: {
                current_week_topics: ["CPU Scheduling", "Deadlocks"],
              },
              recommended_actions: [
                "Complete planner task: Practice CPU Scheduling.",
              ],
            },
            created_at: "2026-04-05T09:15:01Z",
          },
        }),
      });
    });

    await page.goto("/chat");

    await expect(page.getByRole("heading", { name: "AI Study Chat" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Roadmap help/ })).toBeVisible();

    await page
      .getByRole("button", {
        name: "Help me understand my weakest topic using today's context.",
      })
      .click();

    await expect.poll(() => messagePosted).toBeTruthy();
    await expect(
      page.getByText(
        "You are weakest in CPU Scheduling. Start with a 30-minute concept review and then solve 10 targeted questions.",
        { exact: false }
      )
    ).toBeVisible();
    await expect(page.getByText("Daily target: 90 minutes")).toBeVisible();
    await expect(page.getByText("CPU Scheduling (Operating Systems)")).toBeVisible();
  });

  test("creates a new session and sends typed message", async ({
    baseURL,
    context,
    page,
  }) => {
    await setStudentAuth(page, context, baseURL);

    let createdSession = false;
    let sentMessage = false;

    await page.route("**/api/study-chat/sessions", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ sessions: [] }),
        });
        return;
      }

      if (route.request().method() !== "POST") {
        await route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-headers": "*",
          },
          body: "",
        });
        return;
      }

      createdSession = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            session_id: "session-new",
            title: "New Study Chat",
            context_type: "general",
            last_used_at: "2026-04-05T09:30:00Z",
            created_at: "2026-04-05T09:30:00Z",
            updated_at: "2026-04-05T09:30:00Z",
            last_message_preview: null,
            message_count: 0,
          },
          messages: [],
        }),
      });
    });

    await page.route("**/api/study-chat/sessions/session-new", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            session_id: "session-new",
            title: "New Study Chat",
            context_type: "general",
            last_used_at: "2026-04-05T09:30:00Z",
            created_at: "2026-04-05T09:30:00Z",
            updated_at: "2026-04-05T09:30:00Z",
            last_message_preview: null,
            message_count: 0,
          },
          messages: [],
        }),
      });
    });

    await page.route("**/api/study-chat/sessions/session-new/messages", async (route) => {
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

      const payload = route.request().postDataJSON() as { message: string };
      expect(payload.message).toBe("How should I split a 60-minute study block?");
      sentMessage = true;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            session_id: "session-new",
            title: "How Should I Split A",
            context_type: "planner",
            last_used_at: "2026-04-05T09:35:00Z",
            created_at: "2026-04-05T09:30:00Z",
            updated_at: "2026-04-05T09:35:00Z",
            last_message_preview: "Split your session into concept, practice, revision.",
            message_count: 2,
          },
          user_message: {
            id: "msg-user-new",
            role: "user",
            message_text: payload.message,
            grounding_snapshot_json: null,
            created_at: "2026-04-05T09:35:00Z",
          },
          assistant_message: {
            id: "msg-assistant-new",
            role: "assistant",
            message_text:
              "Split 60 minutes into 25 minutes concept review, 25 minutes practice, and 10 minutes revision recap.",
            grounding_snapshot_json: {
              planner: {
                status: "active",
              },
            },
            created_at: "2026-04-05T09:35:01Z",
          },
        }),
      });
    });

    await page.goto("/chat");

    await page.getByRole("button", { name: "New" }).click();
    await expect.poll(() => createdSession).toBeTruthy();

    await page
      .locator("#study-chat-input")
      .fill("How should I split a 60-minute study block?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect.poll(() => sentMessage).toBeTruthy();
    await expect(
      page.getByText("Split 60 minutes into 25 minutes concept review", {
        exact: false,
      })
    ).toBeVisible();
  });
});
