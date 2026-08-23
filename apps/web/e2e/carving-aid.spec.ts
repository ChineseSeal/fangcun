import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

function readPngChunk(png: Buffer, target: string): Buffer | null {
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    if (type === target) return png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
  }
  return null;
}

function extractPdfAsciiText(content: string): string {
  return Array.from(content.matchAll(/<([0-9a-f]+)> Tj/gi), ([, hex]) => {
    if (!hex) return "";
    return Buffer.from(hex, "hex").toString("ascii");
  }).join("");
}

test("shows a strict mirrored proof and real-size preview without changing geometry", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();

  const carvingResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/carving-aid") && response.ok(),
  );
  await page.getByRole("group", { name: "舞台显示方式" })
    .getByRole("button", { name: "刻制辅助", exact: true })
    .click();
  await carvingResponse;

  const normal = page.locator('[data-fangcun-output="carving-normal"]');
  const mirrored = page.locator('[data-fangcun-output="carving-mirror"]');
  await expect(normal).toBeVisible();
  await expect(mirrored).toBeVisible();
  await expect(page.getByRole("figure", { name: "正稿（钤出效果）" }).locator("figcaption")).toBeVisible();
  await expect(page.getByRole("figure", { name: "反稿（上石用）" }).locator("figcaption")).toBeVisible();
  expect(await normal.getAttribute("width")).toBe("25mm");
  expect(await mirrored.getAttribute("width")).toBe("25mm");
  expect(await normal.getAttribute("data-geometry-hash"))
    .toBe(await mirrored.getAttribute("data-geometry-hash"));
  expect(await mirrored.locator('[data-mirror-axis="x-500"]').getAttribute("transform"))
    .toBe("scale(-1 1) translate(-1000 0)");
  expect(await normal.evaluate((element) => element.outerHTML)).not.toMatch(/#B3261E|#F3EFE6/i);

  const fittedWidth = await normal.evaluate((element) => element.getBoundingClientRect().width);
  await page.keyboard.press("r");
  await expect(page.getByRole("button", { name: "近似真实大小" })).toHaveAttribute("aria-pressed", "true");
  const realWidth = await normal.evaluate((element) => element.getBoundingClientRect().width);
  expect(fittedWidth).toBeGreaterThan(realWidth);
  expect(realWidth).toBeCloseTo(25 / 25.4 * 96, 0);

  const settings = page.locator("details").filter({ hasText: "刻制辅助" });
  await openStudioControls(page);
  await settings.locator("summary").click();
  const resizedResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/carving-aid") && response.ok(),
  );
  await settings.getByRole("button", { name: "18 mm", exact: true }).click();
  await resizedResponse;
  await expect(page.locator('[data-fangcun-output="carving-normal"]')).toHaveAttribute("width", "18mm");
  await expect(page.getByText("成品尺寸 18 × 18 mm", { exact: true })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical")).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("exports labeled 1:1 SVG/PDF sheets and a mirrored 300 dpi PNG", async ({ page }) => {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  const carvingResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/carving-aid") && response.ok(),
  );
  await page.keyboard.press("m");
  await carvingResponse;
  await expect(page.locator('[data-fangcun-output="carving-mirror"]')).toBeVisible();

  const svgDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 1:1 正反 SVG", exact: true }).click();
  const svgDownload = await svgDownloadPromise;
  expect(svgDownload.suggestedFilename()).toBe("fangcun-carving-proof-25mm.svg");
  const svgPath = await svgDownload.path();
  expect(svgPath).not.toBeNull();
  if (svgPath) {
    const sheet = await readFile(svgPath, "utf8");
    expect(sheet).toContain('width="76mm" height="59mm"');
    expect(sheet).toContain("正稿（钤出效果）");
    expect(sheet).toContain("反稿（上石用）");
    expect(sheet).toContain('data-size-mm="10"');
    expect(sheet).toContain('transform="scale(-1 1) translate(-1000 0)"');
    expect(sheet).not.toMatch(/#B3261E|#F3EFE6/i);
  }

  const geometryHash = await page.locator('[data-fangcun-output="carving-mirror"]')
    .getAttribute("data-geometry-hash");
  const pdfResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/carving-aid")
      && response.request().postData()?.includes('"output":"pdf"') === true);
  const pdfDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 1:1 PDF", exact: true }).click();
  const [pdfResponse, pdfDownload] = await Promise.all([
    pdfResponsePromise,
    pdfDownloadPromise,
  ]);
  expect(pdfResponse.ok()).toBe(true);
  expect(pdfResponse.headers()["content-type"]).toBe("application/pdf");
  expect(pdfResponse.headers()["x-fangcun-page-mm"]).toBe("76x59");
  expect(pdfResponse.headers()["x-fangcun-geometry-hash"]).toBe(geometryHash);
  expect(pdfDownload.suggestedFilename()).toBe("fangcun-carving-proof-25mm.pdf");
  const pdfPath = await pdfDownload.path();
  expect(pdfPath).not.toBeNull();
  if (pdfPath) {
    const pdf = await readFile(pdfPath);
    const content = pdf.toString("latin1");
    const labels = extractPdfAsciiText(content);
    expect(content.startsWith("%PDF-")).toBe(true);
    expect(content).toContain("/MediaBox [0 0 215.433071 167.244094]");
    expect(content).toContain("/Count 1");
    expect(content).toContain("-1 0 0 1 1000 0 cm");
    expect(labels).toContain("NORMAL / STAMPED");
    expect(labels).toContain("MIRRORED");
    expect(labels).toContain("10 mm SCALE / PRINT 100%");
    expect(labels).toContain("FANGCUN / CHECK SIDES");
  }

  const pngDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出反字 PNG", exact: true }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toBe("fangcun-carving-mirror-25mm-300dpi.png");
  const pngPath = await pngDownload.path();
  expect(pngPath).not.toBeNull();
  if (pngPath) {
    const png = await readFile(pngPath);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(png.readUInt32BE(16)).toBe(295);
    expect(png.readUInt32BE(20)).toBe(295);
    const density = readPngChunk(png, "pHYs");
    expect(density).not.toBeNull();
    expect(density?.readUInt32BE(0)).toBe(11811);
    expect(density?.readUInt32BE(4)).toBe(11811);
    expect(density?.[8]).toBe(1);
  }
});
