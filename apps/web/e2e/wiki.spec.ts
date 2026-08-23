import { expect, test } from "@playwright/test";
import { wikiEntries } from "@fangcun/knowledge/wiki";

test("publishes the 12 core encyclopedia entries", async ({ page }) => {
  await page.goto("/academy/wiki");

  await expect(page.getByRole("heading", { level: 1, name: "印章小百科" })).toBeVisible();
  await expect(page.locator("main a[href^='/academy/wiki/']")).toHaveCount(12);
  await expect(page.getByRole("link", { name: /01 朱文/ })).toHaveAttribute("href", "/academy/wiki/zhuwen");

  const schema = JSON.parse(await page.locator("script[type='application/ld+json']").textContent() ?? "{}");
  expect(schema["@type"]).toBe("DefinedTermSet");
  expect(schema.hasDefinedTerm).toHaveLength(12);
});

test("renders a static DefinedTerm page with an interactive authoritative SVG example", async ({ page }) => {
  const firstRender = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.goto("/academy/wiki/zhuwen");
  await firstRender;

  await expect(page.getByRole("heading", { level: 1, name: "朱文" })).toBeVisible();
  await expect(page.getByLabel("方寸印面预览").locator("svg")).toBeVisible();
  await expect(page.getByRole("button", { name: "朱文印蜕" })).toHaveAttribute("aria-pressed", "true");

  const comparisonRender = page.waitForResponse(
    (response) => response.url().endsWith("/api/seals/render") && response.ok(),
  );
  await page.getByRole("button", { name: "白文对照" }).click();
  await comparisonRender;
  await expect(page.getByRole("button", { name: "白文对照" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("保持文字与布局，只切换印式。")).toBeVisible();

  const schema = JSON.parse(await page.locator("script[type='application/ld+json']").textContent() ?? "{}");
  expect(schema).toMatchObject({ "@type": "DefinedTerm", name: "朱文", termCode: "zhuwen" });
  expect(schema.sameAs.length).toBeGreaterThan(0);
});

test("renders every published example through the authoritative seal API", async ({ request }) => {
  const examples = wikiEntries.flatMap((entry) => entry.examples.map((example) => ({
    dsl: example.dsl,
    label: `${entry.slug}/${example.labelZh}`,
  })));
  const responses = await Promise.all(examples.map(async (example) => ({
    label: example.label,
    response: await request.post("/api/seals/render", { data: { dsl: example.dsl } }),
  })));

  for (const result of responses) {
    expect(result.response.ok(), `${result.label} failed with ${result.response.status()}`).toBe(true);
    const body = await result.response.json() as { ok?: boolean; svg?: string };
    expect(body.ok, result.label).toBe(true);
    expect(body.svg, result.label).toContain("<svg");
  }
});
