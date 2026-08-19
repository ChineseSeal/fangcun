import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const achievementStorageKey = "fangcun:achievements:v1";
const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

async function readEarnedCodes(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate((storageKey) => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { earned?: Record<string, unknown> };
    return Object.keys(parsed.earned ?? {}).sort();
  }, achievementStorageKey);
}

test("awards 初刻 once after a successful generator response and persists it", async ({ page }) => {
  await page.goto("/create?text=%E6%B8%85%E9%A3%8E");
  const toast = page.locator('[role="status"][data-achievement-code="chu_ke"]');
  await expect(toast).toContainText("初刻");
  await expect(toast).toContainText("成功生成第一枚印章");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await readEarnedCodes(page)).toEqual(["chu_ke"]);

  await page.reload();
  await expect(page.getByRole("heading", { name: /为「清风」生成的方案/ })).toBeVisible();
  expect(await readEarnedCodes(page)).toEqual(["chu_ke"]);
});

test("awards 识朱白 at four correct answers without duplicate grants", async ({ page }) => {
  await page.goto("/academy/quiz/intro");
  const answers = ["朱文", "朱文", "从右向左", "界格", "方整紧密，四字趋向平满"];
  for (let index = 0; index < answers.length; index += 1) {
    await page.getByText(answers[index], { exact: true }).last().click();
    await page.getByRole("button", { name: "确认答案" }).click();
    await page.getByRole("button", { name: index === answers.length - 1 ? "查看结果" : "下一题" }).click();
  }

  await expect(page.locator('[role="status"][data-achievement-code="shi_zhu_bai"]')).toContainText("识朱白");
  expect(await readEarnedCodes(page)).toEqual(["shi_zhu_bai"]);
  await page.getByRole("button", { name: /重新练习/ }).click();
  expect(await readEarnedCodes(page)).toEqual(["shi_zhu_bai"]);
});

test("awards 上石 once across repeated carving exports", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  const carvingResponse = page.waitForResponse((response) => response.url().endsWith("/api/carving-aid") && response.ok());
  await page.keyboard.press("m");
  await carvingResponse;

  const firstDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 1:1 正反 SVG", exact: true }).click();
  await firstDownload;
  await expect(page.locator('[role="status"][data-achievement-code="shang_shi"]')).toContainText("上石");

  const secondDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 1:1 正反 SVG", exact: true }).click();
  await secondDownload;
  expect(await readEarnedCodes(page)).toEqual(["shang_shi"]);
});

test("shows earned and locked seal paths in the account collection", async ({ page }) => {
  await page.addInitScript((storageKey) => {
    localStorage.setItem(storageKey, JSON.stringify({
      version: 1,
      updatedAt: "2026-08-12T01:00:00.000Z",
      earned: {
        chu_ke: { code: "chu_ke", earnedAt: "2026-08-12T01:00:00.000Z", sourceEvent: "seal_generated" },
      },
      processedEventKeys: [],
    }));
  }, achievementStorageKey);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "我的印记" })).toBeVisible();
  await expect(page.locator('[data-achievement-code="chu_ke"]')).toHaveAttribute("data-earned", "true");
  await expect(page.locator('[data-achievement-code="shi_zhu_bai"]')).toHaveAttribute("data-earned", "false");
  await expect(page.locator('[data-achievement-code]')).toHaveCount(8);
  await expect(page.locator('[data-achievement-code] [data-glyph-status="missing"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  const critical = (await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()).violations.filter((violation) => violation.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
});
