import { expect, test } from "@playwright/test";

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

test("loads reviewed Gallery work through an explicit second page", async ({ page, request }, testInfo) => {
  test.skip(!hasLocalGalleryService, "requires the isolated local Supabase gallery service");
  const nonce = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const runId = `${Date.now().toString(36)}-${testInfo.project.name.slice(0, 1)}`;
  const email = `pagination-${nonce}@example.test`;
  const password = "Fangcun-Pagination-2026!";
  const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const restUrl = `${supabaseUrl}/rest/v1`;

  const authorCreated = await request.post(authUrl, {
    data: { email, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(authorCreated.ok()).toBe(true);
  const author = await authorCreated.json() as { id?: string };
  if (!author.id) throw new Error("PAGINATION_AUTHOR_CREATE_FAILED");

  const signedIn = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: { email, password },
    headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
  });
  expect(signedIn.ok()).toBe(true);
  const session = await signedIn.json() as { access_token?: string };
  if (!session.access_token) throw new Error("PAGINATION_AUTHOR_SIGN_IN_FAILED");

  const reviewerCreated = await request.post(authUrl, {
    data: { app_metadata: { gallery_reviewer: true }, email: `pagination-reviewer-${nonce}@example.test`, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(reviewerCreated.ok()).toBe(true);
  const reviewer = await reviewerCreated.json() as { id?: string };
  if (!reviewer.id) throw new Error("PAGINATION_REVIEWER_CREATE_FAILED");

  const titles: string[] = [];
  for (let index = 0; index < 13; index += 1) {
    const title = `分页印${runId}-${index + 1}`;
    titles.push(title);
    const seeded = await request.post(`${restUrl}/gallery_posts`, {
      data: {
        dsl: { meta: {}, text: "分页" },
        engine_version: "pagination-e2e",
        glyph_asset_version: "pagination-e2e",
        owner_id: author.id,
        project_id: `pagination-project-${nonce}-${index}`,
        title,
        version_id: `pagination-version-${nonce}-${index}`,
      },
      headers: { ...memberHeaders(session.access_token), Prefer: "return=representation" },
    });
    expect(seeded.ok()).toBe(true);
    const [post] = await seeded.json() as Array<{ id?: string }>;
    if (!post?.id) throw new Error("PAGINATION_POST_CREATE_FAILED");
    const published = await request.post(`${restUrl}/rpc/apply_gallery_review`, {
      data: { next_status_input: "published", reviewer_id_input: reviewer.id, reviewer_note_input: null, subject_id_input: post.id, subject_type_input: "post" },
      headers: serviceHeaders(),
    });
    expect(published.ok()).toBe(true);
  }

  await page.goto("/gallery");
  await expect(page.getByRole("button", { name: "加载更多审核作品" })).toBeVisible();
  for (const title of titles.slice(1)) await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: titles[0], exact: true })).toHaveCount(0);

  const loadMore = page.getByRole("button", { name: "加载更多审核作品" });
  async function loadNextPage() {
    const response = page.waitForResponse((candidate) => {
      const url = new URL(candidate.url());
      return candidate.request().method() === "GET" && url.pathname.endsWith("/rest/v1/gallery_posts");
    });
    await loadMore.click();
    await response;
  }

  await loadNextPage();
  await expect(page.getByRole("heading", { name: titles[0], exact: true })).toBeVisible();
  for (let pageIndex = 0; pageIndex < 3 && await loadMore.isVisible(); pageIndex += 1) await loadNextPage();
  await expect(loadMore).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
