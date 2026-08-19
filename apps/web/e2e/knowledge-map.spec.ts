import { expect, test } from "@playwright/test";

const learningProgress = {
  version: 1,
  updatedAt: "2026-08-15T12:00:00.000Z",
  lessons: {
    "zhu-bai": { status: "completed", startedAt: "2026-08-15T11:00:00.000Z", completedAt: "2026-08-15T11:30:00.000Z" },
    "dao-yintui": { status: "started", startedAt: "2026-08-15T11:45:00.000Z" },
  },
} as const;

const achievementState = {
  version: 1,
  updatedAt: "2026-08-15T12:00:00.000Z",
  earned: {
    shi_zhu_bai: { code: "shi_zhu_bai", earnedAt: "2026-08-15T12:00:00.000Z", sourceEvent: "quiz_completed" },
  },
  processedEventKeys: [],
} as const;

test("shows an accessible, low-pressure map from local learning evidence", async ({ page }) => {
  await page.goto("/academy/map");

  await expect(page.getByTestId("knowledge-map")).toBeVisible();
  await expect(page.getByText("已掌握 0 / 6 个知识节点")).toBeVisible();
  await expect(page.getByTestId("knowledge-map").locator("ol > li")).toHaveCount(6);
  await expect(page.getByText("待探索")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "开始学习" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "打开印章小百科" })).toHaveAttribute("href", "/academy/wiki");
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
});

test("derives mastered and learning states without persisting quiz failures", async ({ page }) => {
  await page.addInitScript(({ learning, achievements }) => {
    localStorage.setItem("fangcun.learning-progress.v1", JSON.stringify(learning));
    localStorage.setItem("fangcun:achievements:v1", JSON.stringify(achievements));
  }, { learning: learningProgress, achievements: achievementState });
  await page.goto("/academy/map");

  await expect(page.getByText("已掌握 2 / 6 个知识节点")).toBeVisible();
  await expect(page.getByTestId("knowledge-map").locator("ol > li[data-status='mastered']")).toHaveCount(2);
  await expect(page.getByTestId("knowledge-map").locator("ol > li[data-status='learning']")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "再做一次小测" })).toBeVisible();
  await expect(page.getByRole("link", { name: "白文" }).first()).toHaveAttribute("href", "/academy/wiki/baiwen");
  expect(await page.evaluate(() => localStorage.getItem("fangcun.quiz"))).toBeNull();

  const firstAction = page.getByRole("link", { name: "复习本课" }).first();
  await firstAction.focus();
  await expect(firstAction).toBeFocused();
});

test("keeps the same evidence map available in English", async ({ page }) => {
  await page.addInitScript(({ learning, achievements }) => {
    localStorage.setItem("fangcun.learning-progress.v1", JSON.stringify(learning));
    localStorage.setItem("fangcun:achievements:v1", JSON.stringify(achievements));
  }, { learning: learningProgress, achievements: achievementState });
  await page.goto("/en/academy/map");

  await expect(page.getByRole("heading", { name: "Connect what you have learned." })).toBeVisible();
  await expect(page.getByText("2 of 6 map points mastered")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open dictionary" })).toHaveAttribute("href", "/en/dictionary");
  await expect(page.getByText("Zhuwen and Baiwen")).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
});
