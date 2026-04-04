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

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).toBeVisible();
});

test("student routes redirect to /login without token", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("admin routes redirect to /login without token", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("non-admin token gets redirected from /admin to /dashboard", async ({
  request,
}) => {
  const response = await request.get("/admin", {
    maxRedirects: 0,
    headers: {
      Cookie: `token=${createUnsignedToken("student")}`,
    },
  });

  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers()["location"]).toContain("/dashboard");
});

test("admin token can stay on /admin route", async ({
  baseURL,
  context,
  page,
}) => {
  const appUrl = baseURL || "http://localhost:3000";

  await context.addCookies([
    {
      name: "token",
      value: createUnsignedToken("admin"),
      url: appUrl,
    },
  ]);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
});