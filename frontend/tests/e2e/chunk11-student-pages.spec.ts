import { expect, test } from "@playwright/test";

test.describe("Chunk 11 student pages", () => {
  test("landing page shows hero and feature cards", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Build Rank-Winning Momentum"
    );
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" })).toBeVisible();
    await expect(page.getByText("Weakness Detection")).toBeVisible();
    await expect(page.getByText("Adaptive Quiz")).toBeVisible();
    await expect(page.getByText("Spaced Revision")).toBeVisible();
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

  test("onboarding submits preferences and redirects", async ({
    baseURL,
    context,
    page,
  }) => {
    const appUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "token",
        value: "playwright-token",
        url: appUrl,
      },
    ]);

    await page.addInitScript(() => {
      localStorage.setItem("token", "playwright-token");
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
            },
          },
          version: 0,
        })
      );
    });

    await page.route("**/api/auth/me", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "playwright-user",
          email: "student@example.com",
          full_name: "Playwright Student",
          role: "student",
          daily_study_minutes: 95,
          experience_level: "intermediate",
        }),
      });
    });

    await page.goto("/onboarding");
    await page.getByLabel("Experience Level").selectOption("intermediate");
    await page.getByLabel("Daily Study Minutes").evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = "95";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page
      .getByRole("button", { name: "Continue to Diagnostic Quiz" })
      .click();

    await expect(page).toHaveURL(/\/quiz\/diagnostic/);
  });

  test("dashboard renders with mocked API payload", async ({
    baseURL,
    context,
    page,
  }) => {
    const appUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "token",
        value: "playwright-token",
        url: appUrl,
      },
    ]);

    await page.addInitScript(() => {
      localStorage.setItem("token", "playwright-token");
    });

    await page.route("**/api/analysis/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
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
          nlp_insight: null,
        }),
      });
    });

    await page.route("**/api/ai/explain", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          topic_name: "CPU Scheduling",
          explanation:
            "You lose marks when selecting scheduling policy under constraints. Practice FCFS, SJF, and RR comparisons with mixed workloads.",
        }),
      });
    });

    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Student Dashboard" })).toBeVisible();
    await expect(page.getByText("CPU Scheduling")).toBeVisible();
    await expect(page.getByText("Operating Systems").first()).toBeVisible();
    await expect(page.getByText("AI Insight")).toBeVisible();
    await expect(page.getByText("Take Adaptive Quiz")).toBeVisible();
  });
});
