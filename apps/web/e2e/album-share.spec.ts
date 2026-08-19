import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasLocalAlbumShareService = Boolean(
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

test("creates a revocable, read-only pinned multi-page cloud album link", async ({ page, request }, testInfo) => {
  test.skip(!hasLocalAlbumShareService, "requires the isolated local Supabase album share service");
  const nonce = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const email = `album-share-${nonce}@example.test`;
  const password = "Fangcun-Album-Share-2026!";
  const title = `分享${nonce.slice(-6)}`;
  const authUrl = `${supabaseUrl}/auth/v1/admin/users`;
  const restUrl = `${supabaseUrl}/rest/v1`;

  const created = await request.post(authUrl, {
    data: { email, email_confirm: true, password },
    headers: serviceHeaders(),
  });
  expect(created.ok()).toBe(true);
  const author = await created.json() as { id?: string };
  if (!author.id) throw new Error("ALBUM_SHARE_AUTHOR_CREATE_FAILED");

  await page.goto("/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0");
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();

  await page.goto("/account");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录并同步" }).click();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();
  await expect(page.getByText("已把 1 枚本机印章同步到你的账户。", { exact: true })).toBeVisible();

  await page.goto("/album");
  await page.getByTestId("album-project-option").first().locator("input").check();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();
  await page.locator("#album-title").fill(title);
  await page.getByTestId("add-album-page").click();
  await page.getByTestId("album-project-option").first().locator("input").check();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();
  await page.getByTestId("save-new-cloud-album").click();
  await expect(page.getByText("已保存为多页云端印谱；仅你的账户可读取。", { exact: true })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("create-cloud-album-share").click();
  const link = page.getByTestId("cloud-album-share-url");
  await expect(link).toBeVisible();
  const shareUrl = await link.inputValue();
  expect(shareUrl).toMatch(/\/album\/share\/[0-9a-f-]{36}$/i);

  const token = shareUrl.split("/").at(-1);
  if (!token) throw new Error("ALBUM_SHARE_TOKEN_MISSING");
  const apiResponse = await request.get(`/api/album-shares/${token}`);
  expect(apiResponse.status()).toBe(200);
  expect(apiResponse.headers()["cache-control"]).toContain("no-store");
  const publicPayload = await apiResponse.json() as { share?: unknown };
  expect(JSON.stringify(publicPayload)).not.toContain(author.id);

  const anonymousLinks = await request.get(`${restUrl}/album_share_links?select=album_id,token`, { headers: { apikey: publishableKey ?? "" } });
  const anonymousSnapshots = await request.get(`${restUrl}/album_share_items?select=share_link_id,dsl`, { headers: { apikey: publishableKey ?? "" } });
  expect(anonymousLinks.ok()).toBe(false);
  expect(anonymousSnapshots.ok()).toBe(false);

  await page.goto(shareUrl);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();
  await expect(page.getByTestId("shared-album-page-position")).toHaveText("第 1 / 2 页");
  await expect(page.getByRole("button", { name: "导出 PNG" })).toHaveCount(0);
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.getByTestId("shared-album-page-position")).toHaveText("第 2 / 2 页");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.goto("/album");
  await page.getByTestId("load-cloud-album").click();
  await expect(page.getByTestId("cloud-album-share-url")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "撤销链接" }).click();
  await expect(page.getByText("分享链接已撤销；云端印谱仍仅你的账户可读取。", { exact: true })).toBeVisible();
  await page.goto(shareUrl);
  await expect(page.getByTestId("shared-album-paper").getByText("此分享印谱不可用，或已被创建者撤销。", { exact: true })).toBeVisible();
});
