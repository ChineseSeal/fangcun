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

test("explains when a collection service is not configured", async ({ page }) => {
  test.skip(Boolean(supabaseUrl), "uses a local gallery integration when Supabase is configured");
  await page.goto("/collections/not-configured");
  await expect(page.getByText("合集需要配置公开作品服务后才能查看。", { exact: true })).toBeVisible();
  await page.goto("/en/collections/not-configured");
  await expect(page.getByText("Collections need the configured public gallery service.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("saves reviewed work atomically, keeps a private collection private, and exposes only opted-in references", async ({ page, request }, testInfo) => {
  test.skip(!hasLocalGalleryService, "requires the isolated local Supabase gallery service");
  const nonce = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const runId = `${Date.now().toString(36)}-${testInfo.project.name.slice(0, 1)}`;
  const email = `collector-${nonce}@example.test`;
  const password = "Fangcun-Collection-2026!";
  const text = "集萃";
  const postTitle = `合集样本${runId}`;
  const collectionTitle = `私藏${runId}`;
  const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const restUrl = `${supabaseUrl}/rest/v1`;

  const authorCreated = await request.post(authUrl, {
    data: { email, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(authorCreated.ok()).toBe(true);
  const author = await authorCreated.json() as { id?: string };
  const authorId = author.id;
  if (!authorId) throw new Error("COLLECTION_AUTHOR_CREATE_FAILED");

  const signedIn = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: { email, password },
    headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
  });
  expect(signedIn.ok()).toBe(true);
  const authorSession = await signedIn.json() as { access_token?: string };
  const authorToken = authorSession.access_token;
  if (!authorToken) throw new Error("COLLECTION_AUTHOR_SIGN_IN_FAILED");

  const reviewerCreated = await request.post(authUrl, {
    data: { app_metadata: { gallery_reviewer: true }, email: `reviewer-${nonce}@example.test`, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(reviewerCreated.ok()).toBe(true);
  const reviewer = await reviewerCreated.json() as { id?: string };
  if (!reviewer.id) throw new Error("COLLECTION_REVIEWER_CREATE_FAILED");

  const seeded = await request.post(`${restUrl}/gallery_posts`, {
    data: {
      dsl: { meta: {}, text },
      engine_version: "collection-e2e",
      glyph_asset_version: "collection-e2e",
      owner_id: authorId,
      project_id: `collection-project-${nonce}`,
      title: postTitle,
      version_id: `collection-version-${nonce}`,
    },
    headers: { ...memberHeaders(authorToken), Prefer: "return=representation" },
  });
  expect(seeded.ok()).toBe(true);
  const [post] = await seeded.json() as Array<{ id?: string }>;
  const postId = post?.id;
  if (!postId) throw new Error("COLLECTION_POST_CREATE_FAILED");

  const published = await request.post(`${restUrl}/rpc/apply_gallery_review`, {
    data: { next_status_input: "published", reviewer_id_input: reviewer.id, reviewer_note_input: null, subject_id_input: postId, subject_type_input: "post" },
    headers: serviceHeaders(),
  });
  expect(published.ok()).toBe(true);

  await page.goto("/account");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并同步" }).click();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();

  await page.goto("/gallery");
  await expect(page.getByRole("heading", { name: postTitle, exact: true })).toBeVisible();
  await page.getByRole("button", { name: `收藏 ${postTitle}` }).click();
  await page.getByLabel("合集名称").fill(collectionTitle);
  await page.getByRole("button", { name: "收藏作品" }).click();
  await expect(page.getByText(`已收藏至《${collectionTitle}》。`, { exact: true })).toBeVisible();

  const collectionLink = page.locator("a").filter({ has: page.getByText(collectionTitle, { exact: true }) });
  await expect(collectionLink).toBeVisible();
  const collectionHref = await collectionLink.getAttribute("href");
  expect(collectionHref).toMatch(/^\/collections\/[0-9a-f-]+$/i);
  const collectionId = collectionHref?.split("/").at(-1);
  if (!collectionId) throw new Error("COLLECTION_LINK_INVALID");

  const ownerItems = await request.get(`${restUrl}/gallery_collection_items?collection_id=eq.${collectionId}&select=collection_id,post_id`, { headers: memberHeaders(authorToken) });
  expect(ownerItems.ok()).toBe(true);
  await expect(ownerItems.json()).resolves.toEqual([{ collection_id: collectionId, post_id: postId }]);
  const anonymousCollections = await request.get(`${restUrl}/gallery_collections?id=eq.${collectionId}&select=id`, { headers: { apikey: publishableKey ?? "" } });
  const anonymousItems = await request.get(`${restUrl}/gallery_collection_items?collection_id=eq.${collectionId}&select=collection_id`, { headers: { apikey: publishableKey ?? "" } });
  await expect(anonymousCollections.json()).resolves.toEqual([]);
  await expect(anonymousItems.json()).resolves.toEqual([]);

  await collectionLink.click();
  await expect(page.getByRole("heading", { name: collectionTitle, exact: true })).toBeVisible();
  await expect(page.getByText("合集不复制 Seal DSL，也不改变来源；每枚作品始终是创作者发布并审核通过的原始快照。", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: postTitle, exact: true })).toBeVisible();

  const publicCreated = await request.post(`${restUrl}/gallery_collections`, {
    data: { description: "公开引用", owner_id: authorId, title: `公开${runId}`, visibility: "public" },
    headers: { ...memberHeaders(authorToken), Prefer: "return=representation" },
  });
  expect(publicCreated.ok()).toBe(true);
  const [publicCollection] = await publicCreated.json() as Array<{ id?: string }>;
  if (!publicCollection?.id) throw new Error("PUBLIC_COLLECTION_CREATE_FAILED");
  const publicItem = await request.post(`${restUrl}/gallery_collection_items`, {
    data: { collection_id: publicCollection.id, post_id: postId },
    headers: memberHeaders(authorToken),
  });
  expect(publicItem.ok()).toBe(true);
  const anonymousPublicItems = await request.get(`${restUrl}/gallery_collection_items?collection_id=eq.${publicCollection.id}&select=post_id`, { headers: { apikey: publishableKey ?? "" } });
  await expect(anonymousPublicItems.json()).resolves.toEqual([{ post_id: postId }]);

  const pending = await request.post(`${restUrl}/gallery_posts`, {
    data: {
      dsl: { meta: {}, text: "待审" },
      engine_version: "collection-e2e",
      glyph_asset_version: "collection-e2e",
      owner_id: authorId,
      project_id: `pending-project-${nonce}`,
      title: "待审作品",
      version_id: `pending-version-${nonce}`,
    },
    headers: { ...memberHeaders(authorToken), Prefer: "return=representation" },
  });
  expect(pending.ok()).toBe(true);
  const [pendingPost] = await pending.json() as Array<{ id?: string }>;
  const unpublishedItem = await request.post(`${restUrl}/gallery_collection_items`, {
    data: { collection_id: publicCollection.id, post_id: pendingPost?.id },
    headers: memberHeaders(authorToken),
  });
  expect(unpublishedItem.ok()).toBe(false);
});
