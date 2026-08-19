import { describe, expect, it } from "vitest";
import { parsePromptWithRules } from "@fangcun/ai-designer";
import { parseIntentWithOpenAi } from "./openai-ai-provider";

function baseline() {
  const parsed = parsePromptWithRules("为书画落款设计一枚古朴的“听雨”姓名章");
  if (!parsed.ok) throw new Error("expected valid baseline");
  return parsed.intent;
}

const config = { apiKey: "test-key", model: "test-model", timeoutMs: 1_000 };

describe("OpenAI AI designer provider", () => {
  it("accepts bounded structured hints while grounding text and explanations locally", async () => {
    const result = await parseIntentWithOpenAi("改成圆形朱文，适合 Logo", baseline(), {
      config,
      createResponse: async (received, input) => {
        expect(received.model).toBe("test-model");
        expect(input.prompt).toContain("圆形朱文");
        return {
          output_parsed: {
            purpose: "brand_logo",
            eraHint: "modern",
            moodTags: ["geometric"],
            shapeHint: "circle",
            modeHint: "yang",
            distressHint: "none",
            borderHint: "single",
            sizeMmHint: 24,
            outputUse: "svg",
            uncertain: [],
          },
        };
      },
    });

    expect(result).toMatchObject({
      ok: true,
      model: "test-model",
      intent: { text: "听雨", purpose: "brand_logo", shapeHint: "circle", modeHint: "yang" },
    });
    if (result.ok) {
      expect(result.intent.reasons[0]?.text).toContain("数字标识");
      expect(JSON.stringify(result.intent)).not.toContain("模型声称");
    }
  });

  it("retries one invalid structured response", async () => {
    let calls = 0;
    const valid = {
      purpose: "calligraphy_signature",
      eraHint: "han",
      moodTags: ["restrained"],
      shapeHint: "square",
      modeHint: "yin",
      distressHint: "slight",
      borderHint: "thick",
      sizeMmHint: 20,
      outputUse: "print",
      uncertain: [],
    } as const;
    const result = await parseIntentWithOpenAi("保持方正", baseline(), {
      config,
      createResponse: async (_received, input) => {
        calls += 1;
        expect(input.attempt).toBe(calls - 1);
        return { output_parsed: calls === 1 ? { purpose: "unknown" } : valid };
      },
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({ ok: true, intent: { eraHint: "han" } });
  });

  it("retries when the SDK structured-output getter rejects invalid data", async () => {
    let calls = 0;
    const result = await parseIntentWithOpenAi("保持方正", baseline(), {
      config,
      createResponse: async () => {
        calls += 1;
        if (calls === 1) {
          return Object.defineProperty({}, "output_parsed", {
            get() { throw new Error("structured output parse failed"); },
          });
        }
        return {
          output_parsed: {
            purpose: "calligraphy_signature",
            eraHint: "han",
            moodTags: ["restrained"],
            shapeHint: "square",
            modeHint: "yin",
            distressHint: "slight",
            borderHint: "thick",
            sizeMmHint: 20,
            outputUse: "print",
            uncertain: [],
          },
        };
      },
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({ ok: true, intent: { text: "听雨" } });
  });

  it("classifies unavailable, refused, invalid and timeout fallbacks", async () => {
    await expect(parseIntentWithOpenAi("任意", baseline(), { config: null }))
      .resolves.toEqual({ ok: false, reason: "AI_PROVIDER_UNAVAILABLE" });
    await expect(parseIntentWithOpenAi("任意", baseline(), {
      config,
      createResponse: async () => ({ output: [{ content: [{ type: "refusal", refusal: "no" }] }] }),
    })).resolves.toEqual({ ok: false, reason: "AI_PROVIDER_REFUSED" });
    await expect(parseIntentWithOpenAi("任意", baseline(), {
      config,
      createResponse: async () => ({ output_parsed: { purpose: "unknown" } }),
    })).resolves.toEqual({ ok: false, reason: "AI_PROVIDER_INVALID_RESPONSE" });
    await expect(parseIntentWithOpenAi("任意", baseline(), {
      config,
      createResponse: async () => { throw new Error("request timed out"); },
    })).resolves.toEqual({ ok: false, reason: "AI_PROVIDER_TIMEOUT" });
  });
});
