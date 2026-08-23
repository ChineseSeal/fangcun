import { expect, test } from "@playwright/test";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

test("keeps the result and canvas ahead of mobile parameter drawers", async ({ isMobile, page }) => {
  test.skip(!isMobile, "mobile information architecture regression");

  await page.goto("/create");
  const createHeading = page.getByRole("heading", { name: /生成的方案/ });
  const createToggle = page.getByRole("button", { name: /生成参数/ });
  await expect(createHeading).toBeVisible();
  await expect(createToggle).toHaveAttribute("aria-expanded", "false");
  const createHeadingBox = await createHeading.boundingBox();
  const createToggleBox = await createToggle.boundingBox();
  expect(createHeadingBox).not.toBeNull();
  expect(createToggleBox).not.toBeNull();
  if (createHeadingBox && createToggleBox) expect(createHeadingBox.y).toBeLessThan(createToggleBox.y);

  await page.goto(studioUrl);
  const preview = page.locator(".studio-preview svg");
  const studioToggle = page.getByRole("button", { name: /参数与字形/ });
  await expect(preview).toBeVisible();
  await expect(studioToggle).toHaveAttribute("aria-expanded", "false");
  await studioToggle.click();
  await expect(studioToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "朱文", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
