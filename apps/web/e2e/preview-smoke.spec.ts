import { expect, test } from "@playwright/test";

const coreRoutes = [
  ["/", "方寸之间"],
  ["/create", "生成"],
  ["/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0", "参考网格"],
  ["/academy", "从一枚印开始"],
  ["/en", "A world within an inch"],
] as const;

test("preview exposes a safe health contract and core routes", async ({ page, request }) => {
  const healthResponse = await request.get("/api/system/health");
  expect(healthResponse.ok()).toBe(true);
  expect(healthResponse.headers()["cache-control"]).toContain("no-store");

  const health = await healthResponse.json();
  expect(health).toMatchObject({
    status: "ok",
    appVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    engineVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    assetVersion: expect.stringMatching(/^\d{4}\.\d{2}\.\d+$/),
    environment: expect.stringMatching(/^(development|staging|production)$/),
  });

  const generatedResponse = await request.post("/api/seals/generate", {
    data: { text: "方寸", style: "han_private", mode: "yin", seed: 42 },
  });
  expect(generatedResponse.ok()).toBe(true);
  const generated = await generatedResponse.json();
  expect(generated).toMatchObject({ ok: true, engineVersion: health.engineVersion, assetVersion: health.assetVersion });
  expect(generated.svg).toMatch(/^<svg[\s>]/);

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  for (const [route, landmark] of coreRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(landmark, { exact: false }).first()).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflows, `${route} should fit inside the viewport`).toBe(false);
  }

  const html = await page.content();
  for (const secretName of ["SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"]) {
    expect(html).not.toContain(secretName);
  }
  for (const secretValue of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.OPENAI_API_KEY]) {
    if (secretValue) expect(html).not.toContain(secretValue);
  }
  expect(consoleErrors, "core preview routes should not emit browser errors").toEqual([]);
});
