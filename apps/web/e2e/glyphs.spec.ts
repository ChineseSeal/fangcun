import { expect, test } from "@playwright/test";

test("serves traceable historical variants for modern input aliases", async ({ request }) => {
  const response = await request.get("/api/glyphs/variants?char=%E5%8F%91&script=xiaozhuan");
  expect(response.ok()).toBe(true);

  const body = await response.json() as {
    variants: Array<{
      assetHash: string;
      assetVersion: string;
      confidence: string;
      isModernSealized: boolean;
      recommended: boolean;
      script: string;
      sourceCharacter: string;
      sourceUrl: string;
      svgPath: string;
    }>;
  };
  expect(body.variants.filter((variant) => variant.script === "xiaozhuan").map((variant) => variant.sourceCharacter)).toEqual(["發", "髮"]);
  expect(body.variants.every((variant) => variant.assetVersion === "2026.08.2")).toBe(true);
  expect(body.variants.every((variant) => variant.assetHash.length >= 16)).toBe(true);
  expect(body.variants.every((variant) => variant.sourceUrl.startsWith("https://"))).toBe(true);
  expect(body.variants.every((variant) => variant.svgPath.startsWith("M"))).toBe(true);
  expect(body.variants.some((variant) => variant.script === "jiaguwen" && variant.confidence === "generated" && variant.isModernSealized)).toBe(true);

  const oracle = await request.get("/api/glyphs/variants?char=%E5%8D%B0&script=jiaguwen");
  const oracleBody = await oracle.json() as typeof body;
  expect(oracleBody.variants.some((variant) => variant.script === "jiaguwen" && variant.recommended)).toBe(true);

  const sprite = await request.get("/glyphs/fangcun-preview-2026.08.2.svg");
  expect(sprite.ok()).toBe(true);
  expect(sprite.headers()["cache-control"]).toContain("max-age=31536000");
  expect(sprite.headers()["cache-control"]).toContain("immutable");
});

test("generates requested historical styles while retaining modern-extension warnings", async ({ request }) => {
  const response = await request.post("/api/seals/generate", {
    data: { text: "清风明月", script: "jiaguwen" },
  });
  expect(response.ok()).toBe(true);
  const body = await response.json() as {
    assetVersion: string;
    candidates: Array<{ explain: { glyphSources: Array<{ confidence: string; fallbackLevel: string; script: string }> } }>;
    warnings: string[];
  };
  expect(body.assetVersion).toBe("2026.08.2");
  expect(body.candidates[0]?.explain.glyphSources).toHaveLength(4);
  expect(body.candidates[0]?.explain.glyphSources.every((glyph) => (
    glyph.script === "jiaguwen" && glyph.confidence === "generated" && glyph.fallbackLevel === "same_script"
  ))).toBe(true);
  expect(body.warnings).toEqual([
    "MODERN_SEALIZATION:清",
    "MODERN_SEALIZATION:风",
    "MODERN_SEALIZATION:明",
    "MODERN_SEALIZATION:月",
  ]);
});

test("renders seal specimens with catalog paths and never with SVG text", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".seal-preview-engine svg")).toBeVisible();
  await expect(page.locator('[data-glyph-renderer="fangcun-paths"]')).toHaveCount(3);
  await expect(page.locator('[data-glyph-renderer="fangcun-paths"] text')).toHaveCount(0);
  await expect(page.locator('[data-glyph-renderer="fangcun-paths"] [data-glyph-status="missing"]')).toHaveCount(0);

  await page.goto("/dictionary");
  await expect(page.getByText("文献字形与现代扩展分层展示")).toBeVisible();
  const historicalGrid = page.getByRole("region", { name: "印字历史字形" });
  await expect(historicalGrid.locator('svg[data-char="印"][data-glyph-status="catalog"]')).toHaveCount(6);
  await expect(historicalGrid.locator('svg[data-glyph-modern="true"]')).toHaveCount(5);
  await expect(historicalGrid.getByText("待收录")).toHaveCount(0);
  await expect(historicalGrid.locator("svg text")).toHaveCount(0);
});
