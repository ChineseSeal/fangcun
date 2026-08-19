import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

test("builds a local album page from a saved Seal DSL and exports PNG/PDF", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();
  await expect(page).toHaveURL(/projectId=project-/);

  await page.goto("/album");
  await expect(page.getByRole("heading", { name: "印谱排版台" })).toBeVisible();
  const project = page.getByTestId("album-project-option").first();
  await expect(project).toBeVisible();
  await project.locator("input").check();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();
  await page.locator("#album-title").fill("方寸试印谱");
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page.getByText(/2 宫格/)).toBeVisible();

  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG" }).click();
  expect((await png).suggestedFilename()).toBe("fangcun-album-page-1.png");

  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PDF" }).click();
  const download = await pdf;
  expect(download.suggestedFilename()).toBe("fangcun-album-page-1.pdf");
  const path = await download.path();
  expect(path).not.toBeNull();
  await expect(page.getByRole("region", { name: "印谱页面预览" }).getByRole("paragraph").last()).toHaveText("当前页 PDF 已导出；打印时请选择 100% / 实际大小。");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("keeps each local album page independently editable", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();

  await page.goto("/album");
  await page.getByTestId("album-project-option").first().locator("input").check();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();
  await page.getByTestId("add-album-page").click();
  await expect(page.getByTestId("album-page-position")).toHaveText("第 2 / 2 页");
  await page.getByTestId("historic-album-reference").first().getByRole("button").click();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toBeVisible();

  await page.getByRole("button", { name: "上一页" }).click();
  await expect(page.getByTestId("album-page-position")).toHaveText("第 1 / 2 页");
  await expect(page.getByTestId("album-project-option").first().locator("input")).toBeChecked();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.getByTestId("historic-album-reference").first().getByRole("button")).toHaveText("移出此页");
  const bookPdf = page.waitForEvent("download");
  const bookResponse = page.waitForResponse((response) => response.url().includes("/api/albums/export") && response.request().method() === "POST" && response.request().postData()?.includes('"pages"') === true);
  await page.getByRole("button", { name: "导出整册 PDF" }).click();
  expect((await bookPdf).suggestedFilename()).toBe("fangcun-album-book.pdf");
  expect((await bookResponse).headers()["x-fangcun-page-count"]).toBe("2");
  await expect(page.getByRole("region", { name: "印谱页面预览" }).getByRole("paragraph").last()).toHaveText("整册 2 页 PDF 已导出；打印时请选择 100% / 实际大小。");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("keeps the English album route static and responsive", async ({ page }) => {
  await page.goto("/en/album");
  await expect(page.getByRole("heading", { name: "Seal album studio" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Album page preview" }).getByRole("paragraph").last()).toHaveText("Select projects on the left or add a historic teaching reference.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
