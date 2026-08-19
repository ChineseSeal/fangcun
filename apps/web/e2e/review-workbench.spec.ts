import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalReviewerService = Boolean(
  supabaseUrl
  && publishableKey
  && serviceRoleKey
  && (() => {
    try {
      return ["127.0.0.1", "localhost"].includes(new URL(supabaseUrl).hostname);
    } catch {
      return false;
    }
  })(),
);

function serviceHeaders() {
  return {
    apikey: serviceRoleKey ?? "",
    Authorization: `Bearer ${serviceRoleKey ?? ""}`,
    "Content-Type": "application/json",
  };
}

function memberHeaders(accessToken: string) {
  return {
    apikey: publishableKey ?? "",
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

test("explains when the review workbench is not configured", async ({ page }) => {
  test.skip(Boolean(supabaseUrl), "uses a local reviewer integration when Supabase is configured");
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "审核工作台" })).toBeVisible();
  await expect(page.getByText("当前环境尚未配置审核服务。", { exact: true })).toBeVisible();
  await expect(page.getByText("待审作品0", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  await page.goto("/en/review");
  await expect(page.getByRole("heading", { name: "Review workbench" })).toBeVisible();
  await expect(page.getByText("Reviewer service is not configured in this environment.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("lets a server-verified local reviewer publish a pending snapshot", async ({ page, request }, testInfo) => {
  test.skip(!hasLocalReviewerService, "requires the isolated local Supabase reviewer service");
  const nonce = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const email = `reviewer-${nonce}@example.test`;
  const password = "Fangcun-Review-2026!";
  const reviewText = `审${nonce.split("-")[0].slice(-6)}`;
  const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const restUrl = `${supabaseUrl}/rest/v1/gallery_posts`;
  const untrustedEmail = `viewer-${nonce}@example.test`;

  const untrustedCreated = await request.post(authUrl, {
    data: { email: untrustedEmail, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(untrustedCreated.ok()).toBe(true);
  const untrustedSignedIn = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: { email: untrustedEmail, password },
    headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
  });
  expect(untrustedSignedIn.ok()).toBe(true);
  const untrustedSession = await untrustedSignedIn.json() as { access_token?: string };
  const forbidden = await request.get("/api/gallery/review", { headers: { Authorization: `Bearer ${untrustedSession.access_token ?? ""}` } });
  expect(forbidden.status()).toBe(403);
  await expect(forbidden.json()).resolves.toMatchObject({ error: { code: "REVIEWER_FORBIDDEN" }, ok: false });

  const created = await request.post(authUrl, {
    data: { app_metadata: { gallery_reviewer: true }, email, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(created.ok()).toBe(true);
  const reviewer = await created.json() as { id?: string };
  expect(typeof reviewer.id).toBe("string");
  const reviewerId = reviewer.id;
  if (!reviewerId) throw new Error("REVIEWER_CREATE_FAILED");

  const signedIn = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: { email, password },
    headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
  });
  expect(signedIn.ok()).toBe(true);
  const session = await signedIn.json() as { access_token?: string };
  const accessToken = session.access_token;
  if (!accessToken) throw new Error("REVIEWER_SIGN_IN_FAILED");

  const seeded = await request.post(restUrl, {
    data: {
      dsl: { meta: {}, text: reviewText },
      engine_version: "review-e2e",
      glyph_asset_version: "review-e2e",
      owner_id: reviewerId,
      project_id: `review-project-${nonce}`,
      status: "pending",
      title: "待审核样本",
      version_id: `review-version-${nonce}`,
    },
    headers: { ...memberHeaders(accessToken), Prefer: "return=representation" },
  });
  expect(seeded.ok()).toBe(true);
  const [post] = await seeded.json() as Array<{ id?: string; status?: string }>;
  expect(post?.status).toBe("pending");
  expect(typeof post?.id).toBe("string");
  const postId = post?.id;
  if (!postId) throw new Error("REVIEW_POST_CREATE_FAILED");

  await page.goto("/account");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并同步" }).click();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "审核工作台" })).toBeVisible();
  const reviewItem = page.getByRole("article").filter({ has: page.getByRole("heading", { exact: true, name: reviewText }) });
  await expect(reviewItem).toBeVisible();
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes("/api/gallery/review") && candidate.request().method() === "PATCH"),
    reviewItem.getByRole("button", { name: "通过并公开" }).click(),
  ]);
  expect(response.ok()).toBe(true);
  await expect(reviewItem.getByText("PUBLISHED", { exact: true })).toBeVisible();

  await expect.poll(async () => {
    const updated = await request.get(`${restUrl}?id=eq.${postId}&select=status`, { headers: memberHeaders(accessToken) });
    if (!updated.ok()) return null;
    const [row] = await updated.json() as Array<{ status?: string }>;
    return row?.status;
  }).toBe("published");
});
