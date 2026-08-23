import { expect, test } from "@playwright/test";

test("plays the first-stamp timeline once and supports an explicit replay", async ({ page }) => {
  await page.goto("/create?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yang");

  const motion = page.getByTestId("first-stamp-motion");
  await expect(motion).toHaveAttribute("data-motion-state", "complete");
  await expect(motion).toHaveAttribute("data-reduced-motion", "false");
  const firstRun = Number(await motion.getAttribute("data-motion-run"));

  const parameterToggle = page.getByRole("button", { name: /生成参数/ });
  if (await parameterToggle.isVisible()) await parameterToggle.click();
  await page.getByRole("button", { name: "重新盖印" }).click();
  await expect(motion).toHaveAttribute("data-motion-run", String(firstRun + 1));
  await expect(motion).toHaveAttribute("data-motion-state", "complete");
  await expect(motion.locator("[data-stamp-print]")).toHaveCSS("opacity", "1");
  await expect(motion.locator("[data-stamp-tool]")).toHaveCSS("visibility", "hidden");
});

test("renders the final stamp without displacement when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/create?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yang");

  const motion = page.getByTestId("first-stamp-motion");
  const print = motion.locator("[data-stamp-print]");
  await expect(motion).toHaveAttribute("data-reduced-motion", "true");
  await expect(motion).toHaveAttribute("data-motion-state", "complete");
  await expect(print).toHaveCSS("opacity", "1");
  await expect(print).toHaveCSS("transform", "none");
  await expect(motion.locator("[data-stamp-tool]")).toHaveCSS("display", "none");
});
