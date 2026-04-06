import { expect, test } from "@playwright/test";

type LoginResponse = {
  access_token: string;
  role: string;
};

type AuthUser = {
  id: string;
  email: string;
  role: string;
  daily_study_minutes?: number;
  experience_level?: string | null;
  exam_target_date?: string | null;
  onboarding_version?: number;
  onboarding_completed_at?: string | null;
  subject_confidences?: Array<{ subject_id: string; confidence_pct: number }>;
  known_topic_ids?: string[];
};

type SubjectItem = {
  id: string;
};

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL;

test.describe("Real backend env smoke", () => {
  test.skip(!backendBaseUrl, "NEXT_PUBLIC_API_URL must be set in .env for real backend smoke tests.");

  test("login and load protected student routes using .env backend", async ({ baseURL, context, page, request }) => {
    const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const studentEmail = `playwright.real.${uniqueSuffix}@smartexamprep.com`;
    const studentPassword = "Playwright@123";

    const registerResponse = await request.post(`${backendBaseUrl}/api/auth/register`, {
      data: {
        email: studentEmail,
        password: studentPassword,
        full_name: "Playwright Real User",
      },
    });
    expect(registerResponse.status(), "Registering real backend user should succeed.").toBe(201);

    const loginResponse = await request.post(`${backendBaseUrl}/api/auth/login`, {
      data: {
        email: studentEmail,
        password: studentPassword,
      },
    });

    expect(loginResponse.status(), "Login to real backend should succeed.").toBe(200);
    const loginData = (await loginResponse.json()) as LoginResponse;
    expect(loginData.access_token).toBeTruthy();

    const meResponse = await request.get(`${backendBaseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginData.access_token}`,
      },
    });
    expect(meResponse.status(), "Authenticated /api/auth/me should succeed.").toBe(200);
    const meData = (await meResponse.json()) as AuthUser;

    const subjectsResponse = await request.get(`${backendBaseUrl}/api/content/subjects`, {
      headers: {
        Authorization: `Bearer ${loginData.access_token}`,
      },
    });
    expect(subjectsResponse.status(), "Fetching subjects for onboarding should succeed.").toBe(200);
    const subjects = (await subjectsResponse.json()) as SubjectItem[];
    test.skip(!Array.isArray(subjects) || subjects.length === 0, "No subjects available for onboarding completion.");

    const targetDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const onboardingResponse = await request.put(`${backendBaseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginData.access_token}`,
      },
      data: {
        daily_study_minutes: 90,
        experience_level: "intermediate",
        exam_target_date: targetDate,
        subject_confidences: [
          {
            subject_id: subjects[0].id,
            confidence_pct: 70,
          },
        ],
        known_topic_ids: [],
      },
    });
    expect(onboardingResponse.status(), "Completing onboarding profile should succeed.").toBe(200);
    const onboardedUser = (await onboardingResponse.json()) as AuthUser;

    const aiStatusResponse = await request.get(`${backendBaseUrl}/api/ai/status`, {
      headers: {
        Authorization: `Bearer ${loginData.access_token}`,
      },
    });
    expect(aiStatusResponse.status(), "Authenticated /api/ai/status should succeed.").toBe(200);

    const appUrl = baseURL || "http://127.0.0.1:3000";
    await context.addCookies([
      {
        name: "access_token",
        value: loginData.access_token,
        url: appUrl,
      },
    ]);

    await page.addInitScript(
      ({ token, user }) => {
        localStorage.setItem("access_token", token);
        localStorage.setItem("token", token);
        localStorage.setItem(
          "auth-store",
          JSON.stringify({
            state: {
              token,
              role: user.role,
              user,
            },
            version: 0,
          })
        );
      },
      {
        token: loginData.access_token,
        user: {
          ...meData,
          ...onboardedUser,
        },
      }
    );

    await page.goto("/chat");
    await expect(page).toHaveURL(/\/chat/);
    await expect(page.getByRole("heading", { name: /AI Study Chat/i })).toBeVisible();

    await page.goto("/progress");
    await expect(page).toHaveURL(/\/progress/);
    await expect(
      page.getByRole("heading", { name: /PROGRESS DASHBOARD/i })
    ).toBeVisible();
  });
});
