import { describe, expect, it } from "vitest";
import {
  IntentCache,
  checkPromptSafety,
  fallbackKeywordRules,
  parsePromptWithRules,
  resolveIntentToDsl,
  sanitizeExplanation,
  studioHrefFromDsl,
} from "./index";

describe("AI designer rule fallback", () => {
  it("covers at least forty documented fallback keywords", () => {
    expect(fallbackKeywordRules.flatMap((rule) => rule.keywords).length).toBeGreaterThanOrEqual(40);
  });

  it.each(fallbackKeywordRules.flatMap((rule) => rule.keywords.map((keyword) => [keyword, rule.profile] as const)))(
    "resolves %s into a valid DSL",
    (keyword, profile) => {
      const parsed = parsePromptWithRules(`请为“方寸”设计一枚${keyword}风格的印章`);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.matchedProfile).toBe(profile);
      expect(resolveIntentToDsl(parsed.intent, 42).dsl).toMatchObject({ text: "方寸", impression: { seed: 42 } });
    },
  );

  it("keeps the previous inscription for a refinement", () => {
    const initial = parsePromptWithRules("设计一枚古玺风格的“听雨”印章");
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;
    const refined = parsePromptWithRules("再疏朗一点，不要边框", initial.intent);
    expect(refined.ok).toBe(true);
    if (!refined.ok) return;
    expect(refined.intent).toMatchObject({ text: "听雨", borderHint: "none" });
    expect(refined.intent.moodTags).toContain("sparse");
  });

  it("asks for an explicit inscription when none can be inferred", () => {
    expect(parsePromptWithRules("给我的书法作品刻一枚姓名章")).toMatchObject({ ok: false, code: "TEXT_REQUIRED" });
  });

  it("blocks official seals and exact replicas", () => {
    expect(checkPromptSafety("做一枚某市人民政府公章")).toMatchObject({ ok: false, code: "OFFICIAL_IMPERSONATION" });
    expect(checkPromptSafety("一比一复刻某大师印章")).toMatchObject({ ok: false, code: "REPLICA_REQUEST" });
  });

  it("filters unverified facts, absolutes and replica claims", () => {
    expect(sanitizeExplanation("此印出土于杭州。必须一比一复刻，才是唯一正宗做法。第三句。"))
      .toBe("通常一比一接近其风格特征，才是常见接近其风格特征做法。第三句。");
  });

  it("expires cached intents without changing their value", () => {
    let now = 100;
    const cache = new IntentCache<{ text: string }>(50, () => now);
    cache.set("a", { text: "方寸" });
    expect(cache.get("a")).toEqual({ text: "方寸" });
    now = 151;
    expect(cache.get("a")).toBeUndefined();
  });

  it("builds an explicit Studio handoff with the resolved seed", () => {
    const parsed = parsePromptWithRules("为博客设计一枚“天眼”Logo 印章");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const dsl = resolveIntentToDsl(parsed.intent, 314).dsl;
    const url = new URL(studioHrefFromDsl(dsl), "https://fangcun.test");
    expect(url.pathname).toBe("/studio");
    expect(url.searchParams.get("text")).toBe("天眼");
    expect(url.searchParams.get("seed")).toBe("314");
  });
});
