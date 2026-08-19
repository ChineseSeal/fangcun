import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

test("completes the representative first-stamp task in under 90 seconds", async ({ page }, testInfo) => {
  const startedAt = Date.now();
  await page.goto("/");
  await expect(page.locator(".seal-preview-engine svg")).toBeVisible();

  const generateResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/generate") && response.ok(),
  );
  await page.getByLabel("输入你想刻下的文字").fill("清风明月");
  await generateResponse;
  await page.getByRole("link", { name: /生成我的印章/ }).click();

  const candidates = page.getByLabel("候选方案").getByRole("button");
  await expect(candidates).toHaveCount(12);
  await candidates.first().click();
  await page.getByRole("link", { name: /进入专业编辑器/ }).click();
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);

  const renderResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.getByRole("slider", { name: "残损" }).fill("0.35");
  await renderResponse;

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG", exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (downloadPath) {
    const png = await readFile(downloadPath);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(1000);
    expect(png.readUInt32BE(20)).toBe(1000);
  }

  const elapsedMs = Date.now() - startedAt;
  await testInfo.attach("g1-task-timing", {
    body: JSON.stringify({ elapsedMs, thresholdMs: 90_000 }),
    contentType: "application/json",
  });
  expect(elapsedMs).toBeLessThan(90_000);
});
