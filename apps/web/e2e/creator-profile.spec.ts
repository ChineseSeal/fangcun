import { expect, test, type APIRequestContext } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalGalleryService = Boolean(
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

async function createSession(request: APIRequestContext, email: string, password: string): Promise<string> {
  const signedIn = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: { email, password },
    headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
  });
  expect(signedIn.ok()).toBe(true);
  const session = await signedIn.json() as { access_token?: string };
  if (!session.access_token) throw new Error("CREATOR_PROFILE_SIGN_IN_FAILED");
  return session.access_token;
}

test("keeps an unavailable creator page explicit when public Gallery is not configured", async ({ page }) => {
  test.skip(hasLocalGalleryService, "uses the configured creator profile flow");
  await page.goto("/creators/not-a-public-profile");
  await expect(page.getByRole("heading", { name: "作者" })).toBeVisible();
  await expect(page.getByText("作者主页需要配置公开作品服务后才能查看。", { exact: true })).toBeVisible();
  await expect(page.getByText("@", { exact: false })).toHaveCount(0);
});

test("publishes an opt-in pen name without exposing account identity or pending works", async ({ page, request }, testInfo) => {
  test.skip(!hasLocalGalleryService, "requires the isolated local Supabase gallery service");
  const nonce = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const runId = `${Date.now().toString(36)}-${testInfo.project.name.slice(0, 1)}`;
  const email = `creator-${nonce}@example.test`;
  const password = "Fangcun-Creator-2026!";
  const penName = `方寸闲人${runId}`;
  const bio = "以篆刻练习章法。";
  const publishedTitle = `公开作者印${runId}`;
  const pendingTitle = `待审作者印${runId}`;
  const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const restUrl = `${supabaseUrl}/rest/v1`;

  const authorCreated = await request.post(authUrl, {
    data: { email, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(authorCreated.ok()).toBe(true);
  const author = await authorCreated.json() as { id?: string };
  if (!author.id) throw new Error("CREATOR_PROFILE_AUTHOR_CREATE_FAILED");
  const authorToken = await createSession(request, email, password);

  const observerEmail = `creator-observer-${nonce}@example.test`;
  const observerCreated = await request.post(authUrl, {
    data: { email: observerEmail, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(observerCreated.ok()).toBe(true);
  const observerToken = await createSession(request, observerEmail, password);

  const reviewerCreated = await request.post(authUrl, {
    data: { app_metadata: { gallery_reviewer: true }, email: `creator-reviewer-${nonce}@example.test`, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(reviewerCreated.ok()).toBe(true);
  const reviewer = await reviewerCreated.json() as { id?: string };
  if (!reviewer.id) throw new Error("CREATOR_PROFILE_REVIEWER_CREATE_FAILED");

  await page.goto("/account");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并同步" }).click();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();
  await page.getByLabel("公开笔名").fill(penName);
  await page.getByLabel("公开简介（可选）").fill(bio);
  await page.getByRole("button", { name: "创建公开作者页" }).click();
  await expect(page.getByText("公开作者页已保存；只会展示笔名、简介与审核通过的作品。", { exact: true })).toBeVisible();

  const profileResponse = await request.get(`${restUrl}/gallery_creator_profiles?owner_id=eq.${author.id}&select=owner_id,display_name,bio`, {
    headers: { apikey: publishableKey ?? "" },
  });
  expect(profileResponse.ok()).toBe(true);
  await expect(profileResponse.json()).resolves.toEqual([{ owner_id: author.id, display_name: penName, bio }]);

  const blockedUpdate = await request.patch(`${restUrl}/gallery_creator_profiles?owner_id=eq.${author.id}`, {
    data: { display_name: "越权笔名" },
    headers: { ...memberHeaders(observerToken), Prefer: "return=representation" },
  });
  expect(blockedUpdate.ok()).toBe(true);
  await expect(blockedUpdate.json()).resolves.toEqual([]);

  for (const [index, title] of [publishedTitle, pendingTitle].entries()) {
    const seeded = await request.post(`${restUrl}/gallery_posts`, {
      data: {
        dsl: { meta: {}, text: index === 0 ? "公开" : "待审" },
        engine_version: "creator-profile-e2e",
        glyph_asset_version: "creator-profile-e2e",
        owner_id: author.id,
        project_id: `creator-profile-project-${nonce}-${index}`,
        title,
        version_id: `creator-profile-version-${nonce}-${index}`,
      },
      headers: { ...memberHeaders(authorToken), Prefer: "return=representation" },
    });
    expect(seeded.ok()).toBe(true);
    const [post] = await seeded.json() as Array<{ id?: string }>;
    if (!post?.id) throw new Error("CREATOR_PROFILE_POST_CREATE_FAILED");
    if (index === 0) {
      const published = await request.post(`${restUrl}/rpc/apply_gallery_review`, {
        data: { next_status_input: "published", reviewer_id_input: reviewer.id, reviewer_note_input: null, subject_id_input: post.id, subject_type_input: "post" },
        headers: serviceHeaders(),
      });
      expect(published.ok()).toBe(true);
    }
  }

  const anonymousWorks = await request.get(`${restUrl}/gallery_posts?owner_id=eq.${author.id}&select=title,status`, { headers: { apikey: publishableKey ?? "" } });
  expect(anonymousWorks.ok()).toBe(true);
  await expect(anonymousWorks.json()).resolves.toEqual([{ title: publishedTitle, status: "published" }]);

  await page.goto("/gallery");
  await expect(page.getByRole("heading", { name: publishedTitle, exact: true })).toBeVisible();
  const authorLink = page.getByRole("link", { name: penName, exact: true });
  await expect(authorLink).toHaveAttribute("href", `/creators/${author.id}`);
  await authorLink.click();
  await expect(page.getByRole("heading", { name: penName, exact: true })).toBeVisible();
  await expect(page.getByText(bio, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: publishedTitle, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: pendingTitle, exact: true })).toHaveCount(0);
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /关注|私信/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /关注|私信/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.goto(`/en/creators/${author.id}`);
  await expect(page.getByRole("heading", { name: penName, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /follow|message/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /follow|message/i })).toHaveCount(0);
  await expect(page.getByText(email, { exact: true })).toHaveCount(0);
});
