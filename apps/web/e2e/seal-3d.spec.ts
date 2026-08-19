import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const studioUrl = "/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0";

declare global {
  interface Window {
    __fangcun3dModuleLoaded?: boolean;
    __fangcun3dCameraMotion?: "gsap" | "static";
    __fangcun3dFallbackElapsed?: number;
  }
}

test.describe.configure({ mode: "serial" });

async function enterStoneStage(page: import("@playwright/test").Page) {
  await page.goto(studioUrl);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await page.getByRole("button", { name: "3D 石章", exact: true }).click();
  await expect(page.getByRole("img", { name: "当前印蜕 SVG 海报" })).toBeVisible();
}

test("loads the R3F viewer only after explicit user action", async ({ page, isMobile }, testInfo) => {
  await enterStoneStage(page);

  if (isMobile) {
    const box = await page.getByRole("img", { name: "当前印蜕 SVG 海报" }).boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    if (box && viewport) expect(box.height).toBeLessThanOrEqual(viewport.height * 0.52 + 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
  }

  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBeUndefined();
  await expect(page.getByText("SVG 海报预览，3D 尚未加载")).toBeVisible();

  const startedAt = Date.now();
  await page.getByRole("button", { name: "打开 3D 石章" }).click();
  await expect(page.getByText("3D 石章已可交互")).toBeVisible({ timeout: 15_000 });
  const elapsedMs = Date.now() - startedAt;
  await testInfo.attach("viewer-3d-ready", {
    body: JSON.stringify({ elapsedMs, developmentServer: true }),
    contentType: "application/json",
  });

  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBe(true);
  await expect(page.getByTestId("seal-3d-canvas-host").locator("canvas")).toBeVisible();
  await expect(page.getByLabel("3D 石章事实").getByText("青田石", { exact: true })).toBeVisible();
  await expect(page.getByLabel("3D 石章事实").getByText(/mm$/)).toBeVisible();
  await expect(page.locator('[data-glyph-relief-source="seal-engine-svg"]')).toHaveAttribute("data-glyph-relief-mode", "recessed");
  await expect(page.locator('[data-glyph-relief-source="seal-engine-svg"]')).toHaveAttribute("data-glyph-relief-depth-scale", "0.032");
  await expect(page.locator('[data-glyph-relief-source="seal-engine-svg"]')).toHaveAttribute("data-glyph-relief-signed-depth-scale", "-0.032");
  await expect(page.getByLabel("3D 石章事实").getByText(/Glyph 路径凹刻预览/)).toBeVisible();
  const critical = (await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze())
    .violations
    .filter((violation) => violation.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);

  const face = page.getByRole("button", { name: "印面", exact: true });
  await face.click();
  await expect(face).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "侧面", exact: true }).click();
  await page.getByRole("button", { name: "印钮", exact: true }).click();

  await page.getByRole("button", { name: "关闭 3D" }).click();
  await expect(page.getByTestId("seal-3d-canvas-host")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "当前印蜕 SVG 海报" })).toBeVisible();
});

test("falls back to the SVG poster within 300ms when save-data is enabled", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true },
    });
    window.addEventListener("fangcun:event", ((event: CustomEvent) => {
      if (event.detail?.name === "viewer_3d_fallback") {
        window.__fangcun3dFallbackElapsed = event.detail.properties?.elapsedMs;
      }
    }) as EventListener);
  });
  await enterStoneStage(page);

  await page.getByRole("button", { name: "打开 3D 石章" }).click();
  await expect(page.getByText(/已使用 SVG 海报降级/)).toBeVisible();
  expect(await page.evaluate(() => window.__fangcun3dFallbackElapsed)).toBeLessThanOrEqual(300);
  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBeUndefined();
  await expect(page.getByRole("img", { name: "当前印蜕 SVG 海报" })).toBeVisible();
  await expect(page.getByLabel("3D 石章事实").getByText("青田石", { exact: true })).toBeVisible();
});

test("switches V2 materials without changing seal SVG geometry or reloading the Canvas", async ({ page }) => {
  await enterStoneStage(page);
  const materials = page.getByRole("group", { name: "3D 材质" });
  const poster = page.getByRole("img", { name: "当前印蜕 SVG 海报" });
  const beforeSvg = await poster.evaluate((element) => element.innerHTML);

  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBeUndefined();
  const jadeRender = page.waitForResponse((response) => response.url().endsWith("/api/seals/render") && response.ok());
  await materials.getByRole("button", { name: "玉", exact: true }).click();
  await jadeRender;
  await expect(page.getByLabel("3D 石章事实").getByText("玉", { exact: true })).toBeVisible();
  expect(await poster.evaluate((element) => element.innerHTML)).toBe(beforeSvg);
  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBeUndefined();

  await page.getByRole("button", { name: "打开 3D 石章" }).click();
  await expect(page.getByText("3D 石章已可交互")).toBeVisible({ timeout: 15_000 });
  const canvas = page.getByTestId("seal-3d-canvas-host").locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.__fangcun3dCameraMotion)).toBe("gsap");

  const copperRender = page.waitForResponse((response) => response.url().endsWith("/api/seals/render") && response.ok());
  await materials.getByRole("button", { name: "铜", exact: true }).click();
  await copperRender;
  await expect(page.getByLabel("3D 石章事实").getByText("铜", { exact: true })).toBeVisible();
  await expect(canvas).toHaveCount(1);
  await expect(page.getByText("3D 石章已可交互")).toBeVisible();

  await page.getByRole("button", { name: "印面", exact: true }).click();
  await expect(page.getByRole("button", { name: "印面", exact: true })).toHaveAttribute("aria-pressed", "true");
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();
  await expect(page).toHaveURL(/projectId=project-/);
  await page.reload();
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await page.getByRole("button", { name: "3D 石章", exact: true }).click();
  await expect(page.getByLabel("3D 石章事实").getByText("铜", { exact: true })).toBeVisible();
});

test("uses a static standard-view transition when reduced motion is requested", async ({ page, isMobile }) => {
  test.skip(isMobile, "one browser-level reduced-motion assertion is sufficient");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await enterStoneStage(page);
  await page.getByRole("button", { name: "打开 3D 石章" }).click();
  await expect(page.getByText("3D 石章已可交互")).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => window.__fangcun3dCameraMotion)).toBe("static");
  await page.getByRole("button", { name: "侧面", exact: true }).click();
  await expect(page.getByRole("button", { name: "侧面", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => window.__fangcun3dCameraMotion)).toBe("static");
});

test("keeps editing available after a WebGL context loss", async ({ page }) => {
  await enterStoneStage(page);
  await page.getByRole("button", { name: "打开 3D 石章" }).click();
  await expect(page.getByText("3D 石章已可交互")).toBeVisible({ timeout: 15_000 });

  await page.getByTestId("seal-3d-canvas-host").locator("canvas").dispatchEvent("webglcontextlost");
  await expect(page.getByText(/WEBGL_CONTEXT_LOST/)).toBeVisible();
  await expect(page.getByTestId("seal-3d-canvas-host")).toHaveCount(0);

  await page.getByRole("button", { name: "印蜕", exact: true }).click();
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await expect(page.getByRole("button", { name: "导出 PNG", exact: true })).toBeEnabled();
});

test("releases the Canvas host across repeated open and close cycles", async ({ page, isMobile }) => {
  test.setTimeout(60_000);
  await enterStoneStage(page);
  const cycles = isMobile ? 5 : 20;

  for (let index = 0; index < cycles; index += 1) {
    await page.getByRole("button", { name: "打开 3D 石章" }).click();
    await expect(page.getByText("3D 石章已可交互")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.getByRole("button", { name: "关闭 3D" }).click();
    await expect(page.locator("canvas")).toHaveCount(0);
  }
});
