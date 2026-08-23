import { expect, test } from "@playwright/test";

test("highlights each engine-derived annotation and preserves the caption list", async ({ page }) => {
  await page.goto("/seals/ying-qu");

  await expect(page.getByRole("heading", { level: 1, name: "白玉羊钮“应衢”印" })).toBeVisible();
  await expect(page.getByText("不是文物原图", { exact: false })).toBeVisible();
  await expect(page.locator("[data-annotation-overlay] path")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "隐藏印文标注" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "隐藏印文标注" }).click();
  await expect(page.locator("[data-annotation-overlay] path")).toHaveCount(3);
  await expect(page.getByText("当前显示 3 / 4 项标注")).toBeVisible();
  await expect(page.getByRole("button", { name: "显示印文标注" })).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "标注已开启" }).click();
  await expect(page.locator("[data-annotation-overlay]")).toHaveCount(0);
  await expect(page.getByText("标注层已关闭，图注仍可阅读")).toBeVisible();
  await expect(page.getByText("印文凸起，钤出后字为红色", { exact: false })).toHaveCount(0);
  await expect(page.getByText("印文凹陷，钤出后字为白色", { exact: false })).toBeVisible();
});

test("supports keyboard comparison with an explicit single-variable contract", async ({ page }) => {
  await page.goto("/seals/ying-qu");

  const slider = page.getByRole("slider", { name: "白文 · 原著录印式与朱文 · 单变量对照对比分割线" });
  await expect(slider).toHaveValue("50");
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("51");
  await expect(page.getByText("两侧使用相同文字、尺寸与布局，只改变正在解释的变量。")).toBeVisible();
  await expect(page.getByRole("link", { name: "查看原始藏品页" })).toHaveAttribute("href", "https://www.dpm.org.cn/collection/seal/229623.html");
});

test("uses the static two-image comparison when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/seals/ying-qu");

  await expect(page.getByRole("slider")).toBeHidden();
  await expect(page.getByText("白文 · 原著录印式", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("朱文 · 单变量对照", { exact: true }).last()).toBeVisible();
});

test("keeps annotation captions and comparison images without JavaScript", async ({ baseURL, browser, isMobile }) => {
  test.skip(isMobile, "one no-JavaScript fallback pass is sufficient");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/seals/ying-qu`);

  await expect(page.getByText("标注层已关闭，图注仍可阅读")).toHaveCount(0);
  await expect(page.getByText("印文凹陷，钤出后字为白色", { exact: false })).toBeVisible();
  await expect(page.getByText("白文 · 原著录印式", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("朱文 · 单变量对照", { exact: true }).last()).toBeVisible();
  await context.close();
});
