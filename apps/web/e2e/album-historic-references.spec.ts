import { expect, test } from "@playwright/test";

test("adds a historic teaching reference to an album without creating a project", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/seals/ying-qu");
  await page.getByRole("link", { name: "入印谱参考" }).click();
  await expect(page).toHaveURL(/\/album\?historic=ying-qu/);

  const reference = page.getByTestId("historic-album-reference").filter({ hasText: "“应衢”玉印" });
  const pageOutput = page.locator('[data-fangcun-output="album-page"]');
  await expect(reference.getByRole("button", { name: /移出/ })).toBeVisible();
  await expect(pageOutput).toContainText("历史印教学参考");
  expect(await page.evaluate(() => window.localStorage.getItem("fangcun:projects:v1"))).toBeNull();

  await reference.getByRole("button", { name: /移出/ }).click();
  await expect(pageOutput).toHaveCount(0);
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await reference.dispatchEvent("dragstart", { dataTransfer });
  await page.getByTestId("album-paper").dispatchEvent("dragover", { dataTransfer });
  await page.getByTestId("album-paper").dispatchEvent("drop", { dataTransfer });
  await expect(reference.getByRole("button", { name: /移出/ })).toBeVisible();
  await expect(pageOutput).toContainText("“应衢”玉印");
});

test("offers the same reference-only album path in English", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.goto("/en/seals/ying-qu");
  await page.getByRole("link", { name: "Add teaching reference to album" }).click();
  await expect(page).toHaveURL(/\/en\/album\?historic=ying-qu/);
  await expect(page.getByRole("heading", { name: "Seal album studio" })).toBeVisible();
  await expect(page.locator('[data-fangcun-output="album-page"]')).toContainText("Historic teaching reference");
  expect(await page.evaluate(() => window.localStorage.getItem("fangcun:projects:v1"))).toBeNull();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
