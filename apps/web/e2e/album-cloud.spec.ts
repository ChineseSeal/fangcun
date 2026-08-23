import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalAlbumService = Boolean(
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

test("explains that cloud albums stay disabled when account sync is not configured", async ({ page }) => {
  test.skip(Boolean(supabaseUrl), "uses a local cloud-album integration when Supabase is configured");
  await page.goto("/album");
  await expect(page.getByText("配置公开 Supabase URL 与 publishable key 后可启用私有云端保存。", { exact: true })).toBeVisible();
  await page.goto("/en/album");
  await expect(page.getByText("Configure the public Supabase URL and publishable key to enable private cloud saves.", { exact: true })).toBeVisible();
});

test("saves owner-only immutable version references in a cloud album", async ({ page, request }, testInfo) => {
  test.skip(!hasLocalAlbumService, "requires the isolated local Supabase album service");
  const nonce = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const email = `album-${nonce}@example.test`;
  const password = "Fangcun-Album-2026!";
  const title = `云谱${nonce.slice(-6)}`;
  const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const restUrl = `${supabaseUrl}/rest/v1`;

  const created = await request.post(authUrl, {
    data: { email, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(created.ok()).toBe(true);
  const author = await created.json() as { id?: string };
  if (!author.id) throw new Error("ALBUM_AUTHOR_CREATE_FAILED");

  const signIn = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: { email, password },
    headers: { apikey: publishableKey ?? "", "Content-Type": "application/json" },
  });
  expect(signIn.ok()).toBe(true);
  const session = await signIn.json() as { access_token?: string };
  if (!session.access_token) throw new Error("ALBUM_AUTHOR_SIGN_IN_FAILED");

  await page.goto("/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0");
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();
  await expect(page).toHaveURL(/projectId=project-/);

  await page.goto("/account");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并同步" }).click();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();
  await expect(page.getByText("已把 1 枚本机印章同步到你的账户。", { exact: true })).toBeVisible();

  await page.goto("/album");
  const project = page.getByTestId("album-project-option").first();
  await expect(project).toBeVisible();
  await project.locator("input").check();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();
  await page.locator("#album-title").fill(title);
  await page.getByTestId("add-album-page").click();
  await expect(page.getByTestId("album-page-position")).toHaveText("第 2 / 2 页");
  await page.getByTestId("historic-album-reference").first().getByRole("button").click();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();
  await page.getByTestId("save-new-cloud-album").click();
  await expect(page.getByText("已保存为多页云端印谱；仅你的账户可读取。", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("create-cloud-album-share").click();
  await expect(page.getByText("含历史印教学参考的云端印谱不能创建分享链接；请移除这些参考后另存，再创建链接。", { exact: true })).toBeVisible();

  const ownerAlbums = await request.get(`${restUrl}/albums?user_id=eq.${author.id}&select=id,title,per_page,page_count`, { headers: memberHeaders(session.access_token) });
  expect(ownerAlbums.ok()).toBe(true);
  const albums = await ownerAlbums.json() as Array<{ id?: string; title?: string }>;
  expect(albums).toHaveLength(1);
  expect(albums[0]?.title).toBe(title);
  expect(albums[0]).toMatchObject({ page_count: 2 });
  const albumId = albums[0]?.id;
  if (!albumId) throw new Error("ALBUM_ID_MISSING");
  const ownerItems = await request.get(`${restUrl}/album_items?album_id=eq.${albumId}&select=project_id,version_id,historic_seal_slug,page,slot`, { headers: memberHeaders(session.access_token) });
  expect(ownerItems.ok()).toBe(true);
  const storedItems = await ownerItems.json() as Array<{ historic_seal_slug?: string | null; page?: number; project_id?: string | null; slot?: number; version_id?: string | null }>;
  expect(storedItems).toEqual(expect.arrayContaining([
    expect.objectContaining({ historic_seal_slug: null, page: 1, slot: 1 }),
    expect.objectContaining({ historic_seal_slug: "ying-qu", page: 2, slot: 1 }),
  ]));
  const storedProject = storedItems.find((item) => item.project_id && item.version_id);
  if (!storedProject?.project_id || !storedProject.version_id) throw new Error("ALBUM_PROJECT_REFERENCE_MISSING");

  const anonymousAlbums = await request.get(`${restUrl}/albums?id=eq.${albumId}&select=id`, { headers: { apikey: publishableKey ?? "" } });
  const anonymousItems = await request.get(`${restUrl}/album_items?album_id=eq.${albumId}&select=album_id`, { headers: { apikey: publishableKey ?? "" } });
  expect(anonymousAlbums.ok()).toBe(false);
  expect(anonymousItems.ok()).toBe(false);
  await expect(anonymousAlbums.json()).resolves.toMatchObject({ code: "42501" });
  await expect(anonymousItems.json()).resolves.toMatchObject({ code: "42501" });

  const forgedHistoric = await request.post(`${restUrl}/album_items`, {
    data: { album_id: albumId, historic_seal_slug: "unverified", page: 1, project_id: null, slot: 2, version_id: null },
    headers: memberHeaders(session.access_token),
  });
  expect(forgedHistoric.ok()).toBe(false);

  const pageOutsideAlbum = await request.post(`${restUrl}/album_items`, {
    data: { album_id: albumId, historic_seal_slug: "da-fu", page: 3, project_id: null, slot: 1, version_id: null },
    headers: memberHeaders(session.access_token),
  });
  expect(pageOutsideAlbum.ok()).toBe(false);

  const malformedSave = await request.post(`${restUrl}/rpc/save_album`, {
    data: { album_id_input: albumId, colophon_input: "题跋", items_input: null, layout_input: "grid", page_count_input: 2, page_size_input: "a4", per_page_input: 4, title_input: title },
    headers: memberHeaders(session.access_token),
  });
  expect(malformedSave.ok()).toBe(false);

  const pageCountViolation = await request.post(`${restUrl}/rpc/save_album`, {
    data: {
      album_id_input: albumId,
      colophon_input: "题跋",
      items_input: [{ historic_seal_slug: null, page: 3, project_id: storedProject.project_id, slot: 1, version_id: storedProject.version_id }],
      layout_input: "grid",
      page_count_input: 2,
      page_size_input: "a4",
      per_page_input: 4,
      title_input: title,
    },
    headers: memberHeaders(session.access_token),
  });
  expect(pageCountViolation.ok()).toBe(false);

  await page.goto("/en/album");
  await expect(page.getByRole("heading", { name: "Seal album studio" })).toBeVisible();
  await expect(page.getByTestId("load-cloud-album")).toHaveCount(1);
  await page.getByTestId("load-cloud-album").click();
  await expect(page.locator("#album-title")).toHaveValue(title);
  await expect(page.getByTestId("album-page-position")).toHaveText("Page 1 / 2");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByTestId("album-page-position")).toHaveText("Page 2 / 2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
