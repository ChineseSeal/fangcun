import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

test("keeps editorial examples distinct from reviewed public work and opens their structure in Studio", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { name: /用户印谱/ })).toBeVisible();
  await expect(page.getByText("当前环境仅展示策展示例，尚未配置公开作品服务。", { exact: true })).toBeVisible();
  await expect(page.locator('[data-source="editorial"]')).toHaveCount(4);
  await page.getByRole("link", { name: "练习结构" }).first().click();
  await expect(page).toHaveURL(/\/studio\?/);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("offers review-first publication from an immutable local project snapshot", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();
  const projectId = await page.evaluate(() => JSON.parse(localStorage.getItem("fangcun:projects:v1") ?? "{}").projects[0].id as string);
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole("heading", { name: "提交到作品区" })).toBeVisible();
  await expect(page.getByText("当前环境未配置公开作品服务；项目仍只保存在本地。", { exact: true })).toBeVisible();
});

test("keeps the English review boundary responsive", async ({ page }) => {
  await page.goto("/en/gallery");
  await expect(page.getByRole("heading", { name: /Community seals/ })).toBeVisible();
  await expect(page.getByText("This environment shows editorial examples only.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Study structure" }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
