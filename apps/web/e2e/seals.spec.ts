import { expect, test } from "@playwright/test";

test("publishes three sourced selected seals instead of placeholder cards", async ({ page }) => {
  await page.goto("/seals");

  await expect(page.getByText("当前展示 3 / 3 枚已核验精选印", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /查看“大府”楚鉨详情/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /查看“新成甲”玉印详情/ })).toBeVisible();
  await expect(page.getByText("少府之印")).toHaveCount(0);
  await expect(page.locator("main svg text")).toHaveCount(0);
});

test("filters selected seals by era and script", async ({ page }) => {
  await page.goto("/seals");

  await page.getByRole("button", { name: "战国", exact: true }).click();
  await expect(page.getByRole("heading", { name: /“大府”楚鉨/ })).toBeVisible();
  await expect(page.getByText("当前展示 1 / 3 枚已核验精选印", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "全部", exact: true }).first().click();
  await page.getByRole("button", { name: "鸟虫书篆", exact: true }).click();
  await expect(page.getByRole("heading", { name: /“新成甲”玉印/ })).toBeVisible();
  await expect(page.getByText("当前展示 1 / 3 枚已核验精选印", { exact: false })).toBeVisible();
});

test("opens every selected detail and hands a new inscription to Studio", async ({ page }) => {
  const entries = [
    ["ying-qu", "白玉羊钮“应衢”印", "方寸"],
    ["da-fu-xi", "楚国铜柱钮“大府”鉨", "清风"],
    ["xin-cheng-jia", "白玉鼻钮“新成甲”印", "方寸印"],
  ] as const;

  for (const [slug, title, practiceText] of entries) {
    await page.goto(`/seals/${slug}`);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText("不是文物原图", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "查看原始藏品页" })).toHaveAttribute("href", /dpm\.org\.cn/);
    const studioLink = page.getByRole("link", { name: "使用类似风格" });
    await expect(studioLink).toHaveAttribute("href", new RegExp(`text=${encodeURIComponent(practiceText)}`));
    await expect(studioLink).toHaveAttribute("href", new RegExp(`sourceSealId=${slug}`));
  }
});

test("loads sourced historic 3D models without presenting them as artifact scans", async ({ page, isMobile }) => {
  const entries = [
    ["ying-qu", "“应衢”玉印 3D 教学模型", "玉", "14 × 14 × 20 mm"],
    ["da-fu-xi", "“大府”楚鉨 3D 教学模型", "铜", "54 × 61 × 117 mm"],
    ["xin-cheng-jia", "“新成甲”玉印 3D 教学模型", "玉", "23 × 23 × 19 mm"],
  ] as const;

  for (const [slug, heading, material, dimensions] of entries) {
    await page.goto(`/seals/${slug}`);
    const panel = page.getByRole("region", { name: heading });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("不是文物扫描、测绘、复原或鉴定模型")).toBeVisible();
    await expect(panel.getByLabel("3D 石章事实").getByText(material, { exact: true })).toBeVisible();
    await expect(panel.getByLabel("3D 石章事实").getByText(dimensions, { exact: true })).toBeVisible();
    await expect(panel.getByRole("group", { name: "3D 材质" })).toHaveCount(0);
    expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBeUndefined();
    if (isMobile) {
      const posterBox = await panel.getByRole("img", { name: "当前印蜕 SVG 海报" }).boundingBox();
      const viewport = page.viewportSize();
      expect(posterBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      if (posterBox && viewport) expect(posterBox.height).toBeLessThanOrEqual(viewport.height * 0.52 + 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    }

    await panel.getByRole("button", { name: "打开 3D 石章" }).click();
    await expect(panel.getByText("3D 石章已可交互")).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByTestId("seal-3d-canvas-host").locator("canvas")).toBeVisible();
    expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBe(true);
    await panel.getByRole("button", { name: "关闭 3D" }).click();
  }
});

test("presents historic 3D facts and approximation boundaries in English", async ({ page }) => {
  await page.goto("/en/seals/da-fu-xi");
  const panel = page.getByRole("region", { name: "Da Fu bronze xi derived 3D study" });

  await expect(panel.getByText("This is not an artifact scan", { exact: false })).toBeVisible();
  await expect(panel.getByLabel("3D seal stone facts").getByText("Copper", { exact: true })).toBeVisible();
  await expect(panel.getByLabel("3D seal stone facts").getByText("54 x 61 x 117 mm (2.13 x 2.40 x 4.61 in)", { exact: true })).toBeVisible();
  await expect(panel.getByRole("group", { name: "3D materials" })).toHaveCount(0);
  expect(await page.evaluate(() => window.__fangcun3dModuleLoaded)).toBeUndefined();
  await panel.getByRole("button", { name: "Open 3D seal" }).click();
  await expect(panel.getByText("The 3D seal stone is interactive.")).toBeVisible({ timeout: 15_000 });
});
