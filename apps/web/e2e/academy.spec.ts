import { expect, test } from "@playwright/test";

test("persists lesson progress and resumes at the next incomplete lesson", async ({ page }) => {
  await page.goto("/academy");
  await expect(page.getByText("0 / 5 课已完成")).toBeVisible();
  await expect(page.locator("[aria-label='L0 入门课程'] article")).toHaveCount(5);

  await page.getByRole("link", { name: "开始学习：识印：朱文与白文" }).click();
  await expect(page).toHaveURL(/\/academy\/lesson\/zhu-bai$/);
  await expect(page.getByRole("button", { name: "标记本课完成" })).toBeEnabled();
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("fangcun.learning-progress.v1");
    return raw ? JSON.parse(raw).lessons["zhu-bai"]?.status : undefined;
  })).toBe("started");

  await page.getByRole("button", { name: "标记本课完成" }).click();
  await expect(page.getByRole("button", { name: "本课已完成" })).toBeDisabled();
  await expect(page.getByText("已完成本课，学习进度已保存在当前设备。")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "本课已完成" })).toBeDisabled();
  await page.getByRole("link", { name: "篆刻学院", exact: true }).click();

  await expect(page.getByText("1 / 5 课已完成")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "1");
  await expect(page.getByRole("link", { name: "已完成 · 再看一遍：识印：朱文与白文" })).toBeVisible();
  await expect(page.getByRole("link", { name: "继续学习", exact: true })).toHaveAttribute("href", "/academy/lesson/zhangfa");
});

test("renders five MDX lessons with authoritative interactive diagrams and Studio practice", async ({ page }) => {
  const lessons = [
    ["zhu-bai", "只切换印式，观察文字颜色"],
    ["zhangfa", "同一方印，密度怎样改变呼吸"],
    ["dao-yintui", "同一几何，钤印状态也会改变观感"],
    ["reading-order", "文字不变，起读方向改变排位"],
    ["yinni", "都是红色，印泥状态仍会留下差别"],
  ] as const;

  for (const [slug, interactiveHeading] of lessons) {
    await page.goto(`/academy/lesson/${slug}`);
    await expect(page.getByRole("heading", { name: interactiveHeading })).toBeVisible();
    await expect(page.locator("main article svg:visible").first()).toBeVisible();
    await expect(page.locator("main article [role='group'] button")).toHaveCount(2);
    await expect(page.locator("main article button[aria-label^='了解术语：']").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /去 Studio/ })).toHaveAttribute("href", /\/studio\?/);
  }
});

test("switches the reading-order teaching SVG and links the final lesson to the quiz", async ({ page }) => {
  await page.goto("/academy/lesson/reading-order");
  const traditional = page.getByRole("button", { name: /传统右起/ });
  const modern = page.getByRole("button", { name: /现代左起/ });
  await expect(traditional).toHaveAttribute("aria-pressed", "true");
  await modern.click();
  await expect(modern).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("figure").getByText("左侧为“应”，用作单变量对照。")).toBeVisible();

  await page.goto("/academy/lesson/yinni");
  await expect(page.getByRole("link", { name: "完成入门小测 →" })).toHaveAttribute("href", "/academy/quiz/intro");
});

test("supports distraction-free presentation and printable A4 handouts", async ({ page }) => {
  await page.goto("/academy/lesson/zhu-bai?present=1");
  const lessonPage = page.getByTestId("lesson-page");
  await expect(lessonPage).toHaveAttribute("data-lesson-display", "presentation");
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeHidden();
  await expect(page.getByRole("link", { name: "退出投屏" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "识印：朱文与白文" })).toBeVisible();
  expect(await page.getByRole("heading", { name: "识印：朱文与白文" }).evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.evaluate(() => {
    window.print = () => document.documentElement.setAttribute("data-print-requested", "true");
  });
  await page.getByRole("button", { name: "打印讲义" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-requested", "true");

  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("group", { name: "课程显示模式" })).toBeHidden();
  await expect(page.getByTestId("lesson-print-variants")).toBeVisible();
  await expect(page.getByTestId("lesson-print-variants").locator("figure")).toHaveCount(2);

  await page.emulateMedia({ media: "screen" });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/academy\/lesson\/zhu-bai$/);
  await expect(lessonPage).toHaveAttribute("data-lesson-display", "reading");
});

test("keeps both lesson variants readable without JavaScript", async ({ baseURL, browser, isMobile }) => {
  test.skip(isMobile, "one no-JavaScript academy fallback pass is sufficient");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/academy/lesson/reading-order`);

  await expect(page.getByText("传统右起 · 右侧为“应”，从右向左读。", { exact: true })).toBeVisible();
  await expect(page.getByText("现代左起 · 左侧为“应”，用作单变量对照。", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /去 Studio/ })).toBeVisible();
  await context.close();
});
