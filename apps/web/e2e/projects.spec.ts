import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

test("saves, versions, and restores without deleting later history", async ({ page }, testInfo) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);

  await page.getByRole("button", { name: "保存项目" }).click();
  if (testInfo.project.name === "mobile-chromium") {
    await page.getByText("版本历史（1）").click();
  }
  await expect(page.getByRole("button", { name: /初始版本，当前版本/ })).toBeVisible();

  const renderResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.getByRole("button", { name: "朱文", exact: true }).click();
  await renderResponse;
  await expect(page.getByRole("button", { name: /版本 2，当前版本/ })).toBeVisible();

  await page.getByRole("button", { name: /初始版本，恢复此版本/ }).click();
  await expect(page.getByText(/已从历史恢复并创建版本 3/)).toBeVisible();
  await expect(page.getByRole("button", { name: /恢复自版本 1，当前版本/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /版本 2，恢复此版本/ })).toBeVisible();

  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "方寸印" })).toBeVisible();
  await expect(page.getByText("3 个不可变版本 · DSL 1.0")).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("fangcun:projects:v1") ?? "{}"));
  expect(stored.projects[0].versions.map((version: { number: number }) => version.number)).toEqual([1, 2, 3]);
});

test("manages local projects across reloads and compact layouts", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("fangcun:projects:v1"))).not.toBeNull();

  await page.goto("/projects");
  const originalCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "方寸印" }) });
  await expect(originalCard).toBeVisible();
  await originalCard.getByRole("button", { name: "重命名" }).click();
  await page.getByLabel("项目名").fill("方寸练习");
  await page.getByRole("button", { name: "保存名称" }).click();
  await expect(page.getByRole("heading", { name: "方寸练习" })).toBeVisible();

  const renamedCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "方寸练习" }) });
  await renamedCard.getByRole("button", { name: "复制" }).click();
  await expect(page.getByRole("heading", { name: "方寸练习 副本" })).toBeVisible();
  await expect(page.getByText("2 / 5 个本地项目")).toBeVisible();

  const copyCard = page.locator("article").filter({ has: page.getByRole("heading", { name: "方寸练习 副本" }) });
  await copyCard.getByRole("button", { name: "归档" }).click();
  await expect(page.getByRole("heading", { name: "方寸练习 副本" })).toHaveCount(0);
  await page.getByRole("button", { name: "已归档" }).click();
  await expect(page.getByRole("heading", { name: "方寸练习 副本" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "方寸练习" })).toBeVisible();
  await page.getByRole("button", { name: "已归档" }).click();
  await expect(page.getByRole("heading", { name: "方寸练习 副本" })).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflows).toBe(false);
});

test("compares, names, and restores immutable project versions", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();

  const renderResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.getByRole("button", { name: "朱文", exact: true }).click();
  await renderResponse;

  await page.goto("/projects");
  await page.getByRole("link", { name: "版本详情" }).click();
  await expect(page.getByRole("heading", { name: "方寸印" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "版本对比" })).toBeVisible();
  await expect(page.getByRole("row", { name: /印面 印式 白文 朱文/ })).toBeVisible();
  await expect(page.locator("[aria-label$='印面预览'] svg")).toHaveCount(3);

  const firstVersion = page.locator("article").filter({ hasText: "初始版本" });
  await firstVersion.getByRole("button", { name: "命名" }).click();
  await page.getByLabel("版本名称").fill("第一稿");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("版本已命名为「第一稿」。")).toBeVisible();

  await page.reload();
  const renamedVersion = page.locator("article").filter({ hasText: "第一稿" });
  await expect(renamedVersion).toBeVisible();
  await renamedVersion.getByRole("button", { name: "恢复" }).click();
  await expect(page.getByText(/已从 v1 恢复并创建 v3/)).toBeVisible();
  await expect(page.getByText("共保留 3 个完整 Seal DSL 快照")).toBeVisible();

  const storedVersions = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("fangcun:projects:v1") ?? "{}");
    return stored.projects[0].versions.map((version: { name: string; number: number }) => ({
      name: version.name,
      number: version.number,
    }));
  });
  expect(storedVersions).toEqual([
    { name: "第一稿", number: 1 },
    { name: "版本 2", number: 2 },
    { name: "恢复自版本 1", number: 3 },
  ]);

  const critical = (await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()).violations.filter((violation) => violation.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
