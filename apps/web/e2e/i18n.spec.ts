import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const studioUrl = "/en/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

test("serves reciprocal English metadata and language switching", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en$/);
  await expect(page.locator('link[rel="alternate"][hreflang="zh-Hans"]')).toHaveAttribute("href", /\/$/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  for (const label of ["Seal", "Create", "Archive", "Dictionary", "Academy", "Gallery"]) {
    await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await page.getByRole("link", { name: "切换到中文" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
});

test("completes the English home to Create to Studio flow", async ({ page }) => {
  await page.goto("/en");
  const input = page.getByLabel("Enter the inscription for your seal");
  await input.fill("清风明月");
  await page.getByRole("link", { name: /Create my seal/ }).click();
  await expect(page).toHaveURL(/\/en\/create/);
  const parameterToggle = page.getByRole("button", { name: /Parameters/ });
  if (await parameterToggle.isVisible()) await parameterToggle.click();
  await expect(page.getByRole("textbox", { name: /Inscription/ })).toHaveValue("清风明月");
  await expect(page.getByLabel("Seal candidates").getByRole("button")).toHaveCount(12);
  if (await parameterToggle.isVisible()) await parameterToggle.click();
  await page.getByRole("link", { name: "Open Studio" }).click();
  await expect(page).toHaveURL(/\/en\/studio/);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await expect(page.getByText("Seal impression updated. The local draft will be saved automatically.")).toBeVisible();
  const controls = page.getByRole("button", { name: /Parameters and glyphs/ });
  if (await controls.isVisible()) await controls.click();
  await expect(page.getByRole("button", { name: "Baiwen", exact: true })).toBeVisible();
});

test("keeps English Studio controls English and shows metric-imperial dimensions", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  const controls = page.getByRole("button", { name: /Parameters and glyphs/ });
  if (await controls.isVisible()) await controls.click();
  await expect(page.getByRole("button", { name: "Zhuwen", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Baiwen", exact: true })).toBeVisible();
  await expect(page.locator("button:visible").filter({ hasText: /^Save$/ }).first()).toBeVisible();
  await page.locator("summary").filter({ hasText: "Carving aids" }).click();
  await expect(page.getByLabel("Common seal-face sizes").getByRole("button", { name: "25mm (0.98in)" })).toBeVisible();
  if (await controls.isVisible()) await controls.click();
  await page.getByRole("button", { name: "Carving aids", exact: true }).click();
  await expect(page.getByText(/Finished size 25 x 25 mm \(0\.98 x 0\.98 in\)/)).toBeVisible();
  await page.getByRole("button", { name: "3D stone", exact: true }).click();
  const materials = page.getByRole("group", { name: "3D materials" });
  await expect(materials.getByRole("button", { name: "Jade", exact: true })).toBeVisible();
  await materials.getByRole("button", { name: "Wood", exact: true }).click();
  await expect(page.getByLabel("3D seal stone facts").getByText("Wood", { exact: true })).toBeVisible();
  const englishControls = await page.locator("button, label, summary, [role='status']").allInnerTexts();
  expect(englishControls.join(" ")).not.toMatch(/撤销|重做|保存项目|复制项目|刻制辅助|版本历史|正在/);
});

test("renders every English content route without overflow or critical accessibility violations", async ({ page }) => {
  const routes = [
    ["/en", "A world within an inch."],
    ["/en/create", "Candidates for"],
    [studioUrl, "Reference grid"],
    ["/en/seals", "Historic seal library"],
    ["/en/seals/ying-qu", "Source and reconstruction"],
    ["/en/dictionary", "Form evolution"],
    ["/en/academy", "Read a world within one seal."],
    ["/en/academy/classroom", "Give every learner a small square to finish."],
    ["/en/academy/map", "Connect what you have learned."],
    ["/en/gallery", "Community seals"],
  ] as const;
  for (const [route, landmark] of routes) {
    await page.goto(route);
    await expect(page.getByText(landmark, { exact: false }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), route).toBe(false);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.filter((violation) => violation.impact === "critical"), route).toEqual([]);
  }
});

test("keeps Chinese and English API geometry facts identical", async ({ request }) => {
  const input = { text: "方寸", style: "han_private", mode: "yin", impression: { seed: 42 } };
  const [chineseResponse, englishResponse] = await Promise.all([
    request.post("/api/seals/generate", { data: { ...input, locale: "zh-Hans" } }),
    request.post("/api/seals/generate", { data: { ...input, locale: "en" } }),
  ]);
  expect(chineseResponse.ok()).toBe(true);
  expect(englishResponse.ok()).toBe(true);
  const chinese = await chineseResponse.json();
  const english = await englishResponse.json();
  const pathTags = (svg: string) => [...svg.matchAll(/<path\b[^>]*>/g)].map((match) => match[0]);
  expect(english.candidates[0].dsl).toEqual(chinese.candidates[0].dsl);
  expect(english.candidates[0].explain).toEqual(chinese.candidates[0].explain);
  expect(pathTags(english.candidates[0].previewSvg)).toEqual(pathTags(chinese.candidates[0].previewSvg));
  expect(english.candidates[0].previewSvg).toContain("Baiwen intaglio seal");
  expect(chinese.candidates[0].previewSvg).toContain("白文印面");
});
