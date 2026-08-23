import { expect, test } from "@playwright/test";

test("updates the deterministic seal preview from input and style", async ({ page }) => {
  await page.goto("/");

  const preview = page.locator(".seal-preview-engine svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("title")).toContainText("方寸");

  const input = page.getByLabel("输入你想刻下的文字");
  const textResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/generate") && response.ok(),
  );
  await input.fill("清风明月");
  await textResponse;
  await expect(preview.locator("title")).toContainText("清风明月");

  const beforeStyleChange = await preview.innerHTML();
  const guxiButton = page.getByRole("button", { name: /3\. 白文 · 满白/ });
  await guxiButton.click();
  await expect(guxiButton).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => preview.innerHTML()).not.toBe(beforeStyleChange);

  await page.getByRole("link", { name: /生成我的印章/ }).click();
  await expect(page).toHaveURL(/\/create\?text=%E6%B8%85%E9%A3%8E%E6%98%8E%E6%9C%88&style=guxi_warring_states&mode=yin/);
  await expect(page.getByLabel("文字内容")).toHaveValue("清风明月");
  await expect(page.getByLabel("候选方案").getByRole("button")).toHaveCount(12);
});

test("keeps the homepage within the viewport", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".seal-preview-engine svg")).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflows).toBe(false);
});
