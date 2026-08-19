import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  aiIntentSchema,
  aiProviderIntentSchema,
  groundedReasonsForIntent,
  type AiIntent,
  type AiProviderIntent,
} from "@fangcun/ai-designer";

const DEFAULT_MODEL = "gpt-5.6-luna";
const DEFAULT_TIMEOUT_MS = 6_000;

const providerInstructions = `You classify a Chinese seal design request into bounded product parameters.
Return only the requested structured object. Never generate Seal DSL, SVG, paths, historical claims, citations, or a replacement inscription.
Preserve explicit user constraints. When the user is refining a prior design, use the supplied baseline for fields they do not change.
Use uncertain only for fields inferred with low confidence. Do not include personal data beyond the supplied design categories.`;

export type AiProviderFallbackReason =
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_PROVIDER_TIMEOUT"
  | "AI_PROVIDER_REFUSED"
  | "AI_PROVIDER_INVALID_RESPONSE"
  | "AI_PROVIDER_ERROR";

export type AiProviderResult =
  | { ok: true; intent: AiIntent; model: string }
  | { ok: false; reason: AiProviderFallbackReason };

type ProviderConfig = {
  apiKey: string;
  model: string;
  timeoutMs: number;
};

type ProviderResponse = {
  output_parsed?: unknown;
  output?: unknown;
};

type CreateResponse = (
  config: ProviderConfig,
  input: { prompt: string; baseline: AiIntent; attempt: number },
) => Promise<ProviderResponse>;

function configuredProvider(): ProviderConfig | null {
  if ((process.env.OPENAI_AI_DESIGNER_PROVIDER ?? "rules").trim().toLowerCase() !== "openai") return null;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const configuredTimeout = Number(process.env.OPENAI_AI_DESIGNER_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(15_000, Math.max(1_000, Math.round(configuredTimeout)))
    : DEFAULT_TIMEOUT_MS;
  return {
    apiKey,
    model: process.env.OPENAI_AI_DESIGNER_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs,
  };
}

export function isOpenAiProviderConfigured(): boolean {
  return configuredProvider() !== null;
}

async function createOpenAiResponse(
  config: ProviderConfig,
  input: { prompt: string; baseline: AiIntent; attempt: number },
): Promise<ProviderResponse> {
  const client = new OpenAI({ apiKey: config.apiKey, maxRetries: 0 });
  return client.responses.parse({
    model: config.model,
    instructions: providerInstructions,
    input: JSON.stringify({
      request: input.prompt,
      baseline: {
        purpose: input.baseline.purpose,
        eraHint: input.baseline.eraHint,
        moodTags: input.baseline.moodTags,
        shapeHint: input.baseline.shapeHint,
        modeHint: input.baseline.modeHint,
        distressHint: input.baseline.distressHint,
        borderHint: input.baseline.borderHint,
        sizeMmHint: input.baseline.sizeMmHint,
        outputUse: input.baseline.outputUse,
        uncertain: input.baseline.uncertain,
      },
      retryInstruction: input.attempt === 0
        ? null
        : "The previous response could not be validated. Return every required field and only allowed enum values.",
    }),
    max_output_tokens: 900,
    prompt_cache_key: "fangcun-ai-intent-v1",
    reasoning: { effort: "none" },
    store: false,
    text: { format: zodTextFormat(aiProviderIntentSchema, "fangcun_ai_intent") },
  }, { timeout: config.timeoutMs });
}

function containsRefusal(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsRefusal);
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.type === "refusal" && typeof record.refusal === "string") return true;
  return Object.values(record).some(containsRefusal);
}

function isTimeout(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return true;
  return error instanceof Error && /timeout|timed out/iu.test(`${error.name} ${error.message}`);
}

export async function parseIntentWithOpenAi(
  prompt: string,
  baseline: AiIntent,
  options: { createResponse?: CreateResponse; config?: ProviderConfig | null } = {},
): Promise<AiProviderResult> {
  const config = options.config === undefined ? configuredProvider() : options.config;
  if (!config) return { ok: false, reason: "AI_PROVIDER_UNAVAILABLE" };
  const createResponse = options.createResponse ?? createOpenAiResponse;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: ProviderResponse;
    try {
      response = await createResponse(config, { prompt, baseline, attempt });
    } catch (error) {
      return { ok: false, reason: isTimeout(error) ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_ERROR" };
    }
    let parsedOutput: unknown;
    try {
      if (containsRefusal(response.output)) return { ok: false, reason: "AI_PROVIDER_REFUSED" };
      parsedOutput = response.output_parsed;
    } catch {
      continue;
    }
    const providerIntent = aiProviderIntentSchema.safeParse(parsedOutput);
    if (!providerIntent.success) continue;
    const intent = aiIntentSchema.parse({
      text: baseline.text,
      ...providerIntent.data,
      reasons: groundedReasonsForIntent(providerIntent.data),
    } satisfies AiIntent);
    return { ok: true, intent, model: config.model };
  }

  return { ok: false, reason: "AI_PROVIDER_INVALID_RESPONSE" };
}

export type { AiProviderIntent };
