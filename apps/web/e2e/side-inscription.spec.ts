import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

test("edits and persists multi-face side inscriptions", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);

  const editor = page.getByTestId("side-inscription-editor");
  await editor.locator("summary").click();
  await expect(editor.getByText("在印石四侧添加阴刻款识", { exact: false })).toBeVisible();

  await editor.getByLabel("正面款识").fill("丙午年方寸刻");
  await editor.getByRole("button", { name: "背面", exact: true }).click();
  await editor.getByLabel("背面款识").fill("于杭州");
  await editor.getByRole("button", { name: "隶书", exact: true }).click();
  await editor.getByRole("button", { name: "双刀", exact: true }).click();

  await expect(editor.locator("summary").getByText("2 面", { exact: true })).toBeVisible();
  await expect(editor.getByRole("img", { name: "边款拓片预览" })).toBeVisible();
  await expect(editor.locator('[data-fangcun-output="inscription-rubbing"]')).toHaveAttribute("data-script", "lishu");
  await expect(editor.locator('[data-fangcun-output="inscription-rubbing"]')).toHaveAttribute("data-knife", "double");

  await page.getByRole("button", { name: "保存项目" }).click();
  await expect(page).toHaveURL(/projectId=project-/);
  await page.reload();
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  const restored = page.getByTestId("side-inscription-editor");
  await restored.locator("summary").click();
  await expect(restored.getByLabel("正面款识")).toHaveValue("丙午年方寸刻");
  await restored.getByRole("button", { name: "背面", exact: true }).click();
  await expect(restored.getByLabel("背面款识")).toHaveValue("于杭州");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("applies a side-inscription template, exports a rubbing, and exposes 3D facts", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);

  const editor = page.getByTestId("side-inscription-editor");
  await editor.locator("summary").click();
  await editor.getByLabel("年月").fill("丙午年");
  await editor.getByLabel("名款").fill("方寸");
  await editor.getByLabel("地点").fill("杭州");
  await editor.getByRole("button", { name: "应用到当前面" }).click();
  await expect(editor.getByLabel("正面款识")).toHaveValue("丙午年方寸刻于杭州");

  const downloadPromise = page.waitForEvent("download");
  await editor.getByRole("button", { name: "导出黑底白字拓片 SVG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("fangcun-side-inscription-1-faces.svg");
  const path = await download.path();
  expect(path).not.toBeNull();
  if (path) {
    const rubbing = await readFile(path, "utf8");
    expect(rubbing).toContain('data-fangcun-output="inscription-rubbing"');
    expect(rubbing).toContain('data-inscription-side="front"');
    expect(rubbing).toContain('fill="#11100e"');
    expect(rubbing).toContain('fill="#fffdf7"');
    expect(rubbing).toContain("丙");
    expect(rubbing).toContain("单刀阴刻");
  }

  await page.getByRole("group", { name: "舞台显示方式" })
    .getByRole("button", { name: "3D 石章" })
    .click();
  await expect(page.getByRole("definition").filter({ hasText: "正面 · 1 面 · 9 字" })).toBeVisible();
  await page.getByRole("button", { name: "打开 3D 石章" }).click();
  await expect(page.getByText("3D 石章已可交互", { exact: true })).toBeVisible();
  await page.getByRole("group", { name: "3D 标准视角" })
    .getByRole("button", { name: "侧面", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "侧面", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("maps round-seal inscriptions to a curved surface with distinct knife depths", async ({ page }) => {
  await page.goto(`${studioUrl}&shape=circle`);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);

  const editor = page.getByTestId("side-inscription-editor");
  await editor.locator("summary").click();
  await editor.getByLabel("正面款识").fill("丙午方寸刻");

  await page.getByRole("group", { name: "舞台显示方式" })
    .getByRole("button", { name: "3D 石章" })
    .click();
  const viewer = page.locator('[data-inscription-surface="cylindrical"]');
  await expect(viewer).toHaveAttribute("data-inscription-relief", "bump");
  await expect(viewer).toHaveAttribute("data-inscription-depth-scale", "0.012");
  await expect(page.getByRole("definition").filter({ hasText: "曲面 UV · 单刀浅凹凸" })).toBeVisible();
  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBeUndefined();

  await page.getByRole("button", { name: "印蜕", exact: true }).click();
  await openStudioControls(page);
  await editor.getByRole("button", { name: "双刀", exact: true }).click();
  await page.getByRole("group", { name: "舞台显示方式" })
    .getByRole("button", { name: "3D 石章" })
    .click();
  await expect(viewer).toHaveAttribute("data-inscription-depth-scale", "0.026");
  await expect(page.getByRole("definition").filter({ hasText: "曲面 UV · 双刀深凹凸" })).toBeVisible();

  await page.getByRole("button", { name: "打开 3D 石章" }).click();
  await expect(page.getByText("3D 石章已可交互", { exact: true })).toBeVisible({ timeout: 15_000 });
  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBe(true);
});

test("provides the side-inscription workflow in English", async ({ page }) => {
  await page.goto("/en/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0");
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);

  const editor = page.getByTestId("side-inscription-editor");
  await editor.locator("summary").click();
  await editor.getByLabel("Front inscription").fill("丙午年");
  await editor.getByRole("button", { name: "Running script", exact: true }).click();
  await expect(editor.getByRole("button", { name: "Running script", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(editor.getByRole("button", { name: "Export black-ground rubbing SVG" })).toBeVisible();
  await expect(page.getByText("年月名款地点模板")).toHaveCount(0);
});
