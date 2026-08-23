import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";
const variantStudioUrl = "/studio?text=%E5%8F%91%E5%AF%B8&style=qin_formal&mode=yin&seed=42&candidate=0";

test("edits, undoes, redoes, and exports the authoritative SVG", async ({ page }) => {
  await page.goto(studioUrl);

  const preview = page.locator(".studio-preview svg");
  await expect(preview).toBeVisible();
  await expect(page.getByText("印面已更新，本地草稿将自动保存。")).toBeVisible();
  const initialSvg = await preview.innerHTML();
  await openStudioControls(page);

  const changeResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.getByRole("button", { name: "朱文", exact: true }).click();
  await changeResponse;
  await expect.poll(() => preview.innerHTML()).not.toBe(initialSvg);

  const undoResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.getByRole("button", { name: "撤销" }).click();
  await undoResponse;
  await expect.poll(() => preview.innerHTML()).toBe(initialSvg);

  const redoResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.getByRole("button", { name: "重做" }).click();
  await redoResponse;
  await expect.poll(() => preview.innerHTML()).not.toBe(initialSvg);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 SVG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("fangcun-seal.svg");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (downloadPath) {
    const exportedSvg = await readFile(downloadPath, "utf8");
    expect(exportedSvg).toContain("<svg");
    expect(exportedSvg).toContain("方寸印面 方寸");
  }

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG", exact: true }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("fangcun-seal.png");
  const pngPath = await pngDownload.path();
  expect(pngPath).not.toBeNull();
  if (pngPath) {
    const png = await readFile(pngPath);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(1000);
    expect(png.readUInt32BE(20)).toBe(1000);
  }

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflows).toBe(false);
});

test("selects and locks a single-glyph Variant with history support", async ({ page }) => {
  await page.goto(variantStudioUrl);
  const preview = page.locator(".studio-preview svg");
  await expect(preview).toBeVisible();
  const initialSvg = await preview.innerHTML();
  await openStudioControls(page);

  const variantGroup = page.getByLabel("发的字形 Variant");
  await expect(variantGroup.getByRole("button")).toHaveCount(12);
  await expect(variantGroup.getByRole("button", { name: "使用小篆字形" })).toHaveCount(2);
  const variantResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await variantGroup.getByRole("button", { name: "使用小篆字形" }).nth(1).click();
  await variantResponse;
  await expect.poll(() => preview.innerHTML()).not.toBe(initialSvg);

  await page.getByRole("button", { name: "锁定字形" }).click();
  await expect(page.getByRole("button", { name: "解除锁定" })).toBeVisible();
  await page.getByRole("button", { name: "撤销" }).click();
  await expect(page.getByRole("button", { name: "锁定字形" })).toBeVisible();

  await page.getByRole("button", { name: "了解术语：白文" }).first().click();
  await expect(page.getByRole("note").filter({ hasText: "印文凹陷" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("note").filter({ hasText: "印文凹陷" })).toHaveCount(0);
});

test("preserves the latest preview when the editor goes offline", async ({ context, page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText("当前离线，已保留最近一次印面与本地编辑状态。")).toBeVisible();
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await context.setOffline(false);
});
