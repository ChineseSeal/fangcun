import { expect, test } from "@playwright/test";

test("grades quiz answers on the server", async ({ request }) => {
  const response = await request.post("/api/quiz/intro/submit", {
    data: { questionId: "intro-baiwen", optionId: "zhuwen" },
  });
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    ok: true,
    result: {
      correct: false,
      correctOptionId: "baiwen",
      questionId: "intro-baiwen",
    },
  });
});

test("rejects unknown quiz sets and options", async ({ request }) => {
  const missing = await request.post("/api/quiz/missing/submit", {
    data: { questionId: "intro-baiwen", optionId: "baiwen" },
  });
  const invalid = await request.post("/api/quiz/intro/submit", {
    data: { questionId: "intro-baiwen", optionId: "not-an-option" },
  });
  expect(missing.status()).toBe(404);
  expect(invalid.status()).toBe(400);
});

test("rejects an empty generation request as a structured client error", async ({ request }) => {
  const response = await request.post("/api/seals/generate", {
    data: "",
    headers: { "content-type": "application/json" },
  });

  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code: "DSL_NOT_OBJECT" },
  });
});

test("preserves a selected historic style profile without copying its inscription", async ({ request }) => {
  const response = await request.post("/api/seals/generate", {
    data: {
      text: "清风",
      style: "guxi_warring_states",
      script: "guxi",
      mode: "yin",
      layout: { strategy: "horizontal_2", density: 0.74, readingOrder: "modern" },
      border: { type: "single", width: 0.035 },
      impression: { distress: 0.12, inkUneven: 0.1, seed: 26253 },
      meta: { sourceSealId: "da-fu-xi" },
    },
  });

  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.candidates[0].dsl).toMatchObject({
    text: "清风",
    style: "guxi_warring_states",
    script: "guxi",
    layout: { strategy: "horizontal_2", density: 0.74, readingOrder: "modern" },
    meta: { sourceSealId: "da-fu-xi" },
  });
  expect(JSON.stringify(body)).not.toContain("大府");
});

test("turns a natural-language request into four valid rule-fallback candidates", async ({ request }) => {
  const response = await request.post("/api/ai/design", {
    data: { prompt: "为书画落款设计一枚汉印风格的“听雨”姓名章", seed: 42 },
  });

  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    advisorMode: "rules",
    fallbackReason: "AI_PROVIDER_UNAVAILABLE",
    intent: { text: "听雨", purpose: "calligraphy_signature", eraHint: "han" },
    dsl: { text: "听雨", style: "han_private", script: "han_seal", impression: { seed: 42 } },
  });
  expect(body.candidates).toHaveLength(4);
  expect(body.candidates.every((candidate: { missingGlyphs: string[] }) => candidate.missingGlyphs.length === 0)).toBe(true);
});

test("reuses only the cached intent while rebuilding the requested seed", async ({ request }) => {
  const prompt = "为茶室设计一枚雅致的“清和”小印";
  const first = await request.post("/api/ai/design", { data: { prompt, seed: 101 } });
  const second = await request.post("/api/ai/design", { data: { prompt, seed: 202 } });
  const firstBody = await first.json();
  const secondBody = await second.json();

  expect(first.ok()).toBe(true);
  expect(second.ok()).toBe(true);
  expect(secondBody.cache).toBe("hit");
  expect(secondBody.intent).toEqual(firstBody.intent);
  expect(firstBody.dsl.impression.seed).toBe(101);
  expect(secondBody.dsl.impression.seed).toBe(202);
});

test("rejects official-seal requests before generation", async ({ request }) => {
  const response = await request.post("/api/ai/design", {
    data: { prompt: "帮我设计一枚某市人民政府公章" },
  });

  expect(response.status()).toBe(422);
  await expect(response.json()).resolves.toMatchObject({
    ok: false,
    error: { code: "OFFICIAL_IMPERSONATION" },
  });
});
