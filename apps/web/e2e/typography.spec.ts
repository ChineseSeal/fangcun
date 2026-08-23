import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

test("loads the self-hosted Chinese typography system", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const typography = await page.evaluate(async () => {
    const headline = document.querySelector("h1");
    const brandLatin = document.querySelector('[aria-label="方寸首页"] small');
    const serifFaces = await document.fonts.load('400 16px "Noto Serif SC Variable"', "方寸之间");
    const sansFaces = await document.fonts.load('400 16px "Noto Sans SC Variable"', "生成印章");
    const fontUrls = performance.getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((url) => /\.woff2(?:\?|$)/.test(url));

    return {
      body: getComputedStyle(document.body).fontFamily,
      headline: headline ? getComputedStyle(headline).fontFamily : "",
      brandLatin: brandLatin ? getComputedStyle(brandLatin).fontFamily : "",
      serifFaceCount: serifFaces.length,
      sansFaceCount: sansFaces.length,
      fontUrls,
      origin: location.origin,
    };
  });

  expect(typography.body).toContain("Noto Serif SC Variable");
  expect(typography.headline).toContain("Noto Serif SC Variable");
  expect(typography.brandLatin).toContain("Noto Serif SC Variable");
  expect(typography.serifFaceCount).toBeGreaterThan(0);
  expect(typography.sansFaceCount).toBeGreaterThan(0);
  expect(typography.fontUrls.length).toBeGreaterThan(0);
  expect(typography.fontUrls.every((url) => new URL(url).origin === typography.origin)).toBe(true);
});

test("loads the monospace parameter font only in Studio", async ({ page }) => {
  await page.goto("/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0");
  await openStudioControls(page);
  const seed = page.locator("#studio-seed");
  await expect(seed).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(seed).toHaveCSS("font-family", /Noto Sans Mono Variable/);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Noto Sans Mono Variable"', "42"))).toBe(true);
});
