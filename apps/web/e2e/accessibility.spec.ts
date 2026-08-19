import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  { path: "/", ready: ".seal-preview-engine svg" },
  { path: "/create", ready: "[data-testid='first-stamp-motion']" },
  { path: "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0", ready: ".studio-preview svg" },
  { path: "/projects", ready: "main h1" },
  { path: "/ai", ready: "[aria-label='AI 篆刻对话']" },
  { path: "/academy", ready: "[aria-label='L0 入门课程']" },
  { path: "/academy/classroom", ready: "[aria-label='课堂练习模板列表']" },
  { path: "/academy/map", ready: "[data-testid='knowledge-map']" },
  { path: "/academy/lesson/zhu-bai", ready: "main article" },
  { path: "/academy/lesson/zhu-bai?present=1", ready: "[data-testid='lesson-page'][data-lesson-display='presentation']" },
  { path: "/academy/lesson/yinni", ready: "main article svg:visible" },
  { path: "/academy/wiki", ready: "main a[href='/academy/wiki/zhuwen']" },
  { path: "/academy/wiki/zhuwen", ready: "[aria-labelledby='wiki-example-heading'] svg" },
  { path: "/academy/quiz/intro", ready: "[data-testid='quiz-runner'] svg" },
  { path: "/seals/ying-qu", ready: "[aria-labelledby='annotation-heading'] svg[data-retained-ink]" },
  { path: "/seals/da-fu-xi", ready: "[aria-labelledby='annotation-heading'] svg[data-retained-ink]" },
  { path: "/seals/xin-cheng-jia", ready: "[aria-labelledby='annotation-heading'] svg[data-retained-ink]" },
] as const;

for (const route of routes) {
  test(`${route.path} has no critical axe violations`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator(route.ready)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const critical = results.violations.filter((violation) => violation.impact === "critical");

    expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
  });
}
