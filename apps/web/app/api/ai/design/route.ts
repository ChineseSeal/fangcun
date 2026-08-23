import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  IntentCache,
  aiIntentSchema,
  checkPromptSafety,
  normalizePrompt,
  parsePromptWithRules,
  resolveIntentToDsl,
  sanitizeExplanation,
  type AiIntent,
} from "@fangcun/ai-designer";
import { parseIntentWithOpenAi, type AiProviderFallbackReason } from "@/lib/openai-ai-provider";
import { checkCompliance } from "@fangcun/compliance";
import { hashSeed } from "@fangcun/dsl-schema";
import { GLYPH_ASSET_VERSION, loadGlyphCatalogForText } from "@fangcun/glyph-tools/server";
import { ENGINE_VERSION, generateSealCandidates } from "@fangcun/seal-engine";

export const runtime = "nodejs";

type CachedIntent = {
  intent: AiIntent;
  advisorMode: "rules" | "model";
  providerModel?: string;
  fallbackReason?: AiProviderFallbackReason;
};

const intentCache = new IntentCache<CachedIntent>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestSeed(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 4_294_967_295) return value;
  return randomBytes(4).readUInt32BE(0);
}

function cacheKey(prompt: string, previous?: AiIntent): string {
  const context = previous ? JSON.stringify(previous) : "new";
  return `${normalizePrompt(prompt)}:${hashSeed(context)}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "PROMPT_REQUIRED", message: "请求体必须是有效 JSON。", suggestion: "请提交 prompt 字段。" } },
      { status: 400 },
    );
  }
  if (!isRecord(body) || typeof body.prompt !== "string" || body.prompt.length > 500) {
    return NextResponse.json(
      { ok: false, error: { code: "PROMPT_REQUIRED", message: "prompt 必须是 1–500 字符的字符串。", suggestion: "请描述印文、用途与气质。" } },
      { status: 400 },
    );
  }

  const safety = checkPromptSafety(body.prompt);
  if (!safety.ok) {
    return NextResponse.json(
      { ok: false, error: { code: safety.code, message: safety.message, suggestion: safety.suggestion } },
      { status: 422 },
    );
  }

  const previousParsed = body.previousIntent === undefined
    ? undefined
    : aiIntentSchema.safeParse(body.previousIntent);
  if (previousParsed && !previousParsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_CONTEXT", message: "上一轮参数已失效。", suggestion: "请重新描述完整需求。" } },
      { status: 400 },
    );
  }
  const previousIntent = previousParsed?.data;
  const key = cacheKey(body.prompt, previousIntent);
  const cached = intentCache.get(key);
  let intent: AiIntent;
  let advisorMode: CachedIntent["advisorMode"];
  let providerModel: string | undefined;
  let fallbackReason: AiProviderFallbackReason | undefined;

  if (cached) {
    ({ intent, advisorMode, providerModel, fallbackReason } = cached);
  } else {
    const ruleParsed = parsePromptWithRules(body.prompt, previousIntent);
    if (!ruleParsed.ok) {
      return NextResponse.json(
        { ok: false, error: { code: ruleParsed.code, message: ruleParsed.message, suggestion: ruleParsed.suggestion } },
        { status: ruleParsed.code === "UNSAFE_REQUEST" ? 422 : 400 },
      );
    }
    const provider = await parseIntentWithOpenAi(body.prompt, ruleParsed.intent);
    if (provider.ok) {
      intent = provider.intent;
      advisorMode = "model";
      providerModel = provider.model;
    } else {
      intent = ruleParsed.intent;
      advisorMode = "rules";
      fallbackReason = provider.reason;
    }
    if (advisorMode === "model" || fallbackReason === "AI_PROVIDER_UNAVAILABLE") {
      intentCache.set(key, { intent, advisorMode, providerModel, fallbackReason });
    }
  }

  const seed = requestSeed(body.seed);
  const resolved = resolveIntentToDsl(intent, seed);
  const compliance = checkCompliance({ text: resolved.dsl.text, dsl: resolved.dsl });
  if (!compliance.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "COMPLIANCE_BLOCKED",
          message: compliance.findings[0]?.message ?? "该请求无法生成。",
          suggestion: compliance.findings[0]?.suggestion ?? "请改用个人创作文字。",
          findings: compliance.findings,
        },
      },
      { status: 422 },
    );
  }

  const glyphCatalog = await loadGlyphCatalogForText(resolved.dsl.text);
  const primaryBatch = generateSealCandidates(resolved.dsl, glyphCatalog);
  const alternateSeed = (seed ^ 2_654_435_769) >>> 0;
  const alternateBatch = generateSealCandidates(
    { ...resolved.dsl, impression: { ...resolved.dsl.impression, seed: alternateSeed } },
    glyphCatalog,
  );
  if (!primaryBatch.ok || !alternateBatch.ok) {
    return NextResponse.json(
      { ok: false, error: { code: "DSL_INVALID", message: "推荐参数未能通过 Seal DSL 校验。", suggestion: "请调整描述后重试。" } },
      { status: 400 },
    );
  }
  const fourth = alternateBatch.candidates[0];
  const candidates = [
    ...primaryBatch.candidates,
    ...(fourth ? [{ ...fourth, candidateId: "c_04", score: Math.max(0, fourth.score - 0.03) }] : []),
  ];

  return NextResponse.json({
    ok: true,
    advisorMode,
    ...(providerModel ? { providerModel } : {}),
    ...(fallbackReason ? { fallbackReason } : {}),
    cache: cached ? "hit" : "miss",
    intent: {
      ...intent,
      reasons: intent.reasons.map((reason) => ({ ...reason, text: sanitizeExplanation(reason.text) })),
    },
    dsl: resolved.dsl,
    resolveLog: resolved.resolveLog,
    candidates,
    compliance: { decision: compliance.decision, findings: compliance.findings },
    engineVersion: ENGINE_VERSION,
    assetVersion: GLYPH_ASSET_VERSION,
  });
}
