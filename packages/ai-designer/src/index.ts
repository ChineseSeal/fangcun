import { hashSeed, normalizeSealDsl, type SealDsl } from "@fangcun/dsl-schema";
import { z } from "zod";

export const purposeTypes = [
  "calligraphy_signature",
  "brand_logo",
  "gift",
  "leisure",
  "tea_space",
  "general",
] as const;

export const eraHintTypes = [
  "shang",
  "western_zhou",
  "warring_states",
  "qin",
  "han",
  "ming_qing",
  "modern",
] as const;

export const moodTypes = [
  "ancient",
  "restrained",
  "grand",
  "quiet",
  "elegant",
  "sparse",
  "geometric",
] as const;

export const aiReasonSchema = z.object({
  field: z.string().min(1).max(40),
  text: z.string().min(1).max(120),
  termSlugs: z.array(z.string().min(1).max(40)).max(4),
});

export const aiIntentSchema = z.object({
  text: z.string().min(1).max(8),
  purpose: z.enum(purposeTypes),
  eraHint: z.enum(eraHintTypes),
  moodTags: z.array(z.enum(moodTypes)).max(6),
  shapeHint: z.enum(["square", "circle", "rect"]),
  modeHint: z.enum(["yin", "yang"]),
  distressHint: z.enum(["none", "slight", "medium", "strong"]),
  borderHint: z.enum(["none", "single", "thick", "irregular"]),
  sizeMmHint: z.number().min(8).max(120),
  outputUse: z.enum(["screen", "svg", "print", "carving"]),
  uncertain: z.array(z.string().min(1).max(40)).max(8),
  reasons: z.array(aiReasonSchema).min(1).max(4),
});

// The external model only classifies bounded design hints. Seal text and
// cultural explanations remain local, deterministic inputs to the resolver.
export const aiProviderIntentSchema = aiIntentSchema.omit({
  text: true,
  reasons: true,
});

export type AiIntent = z.infer<typeof aiIntentSchema>;
export type AiReason = z.infer<typeof aiReasonSchema>;
export type AiProviderIntent = z.infer<typeof aiProviderIntentSchema>;

type StyleProfileCode =
  | "jiaguwen_shang"
  | "jinwen_zhou"
  | "guxi_warring_states"
  | "qin_formal"
  | "han_private"
  | "bird_worm_han_private"
  | "literati_ming_qing"
  | "modern_brand";

export type FallbackKeywordRule = {
  profile: StyleProfileCode;
  keywords: readonly string[];
};

export const fallbackKeywordRules: readonly FallbackKeywordRule[] = [
  { profile: "jiaguwen_shang", keywords: ["甲骨", "殷商", "商代", "卜辞", "龟甲", "原始", "上古"] },
  { profile: "jinwen_zhou", keywords: ["金文", "钟鼎", "西周", "青铜", "铭文", "厚重", "庄重"] },
  { profile: "bird_worm_han_private", keywords: ["鸟虫篆", "鸟虫书", "虫鸟", "华丽", "装饰", "曲折"] },
  { profile: "guxi_warring_states", keywords: ["古玺", "战国", "高古", "古朴", "古拙", "孤寂", "苍茫", "自由"] },
  { profile: "qin_formal", keywords: ["秦印", "秦篆", "秦代", "方整", "界格", "规整"] },
  { profile: "han_private", keywords: ["汉印", "汉篆", "汉代", "姓名章", "名章", "落款", "书法", "平正", "宽博"] },
  { profile: "literati_ming_qing", keywords: ["文人印", "明清", "闲章", "雅致", "茶室", "茶席", "清雅", "清逸", "诗意"] },
  { profile: "modern_brand", keywords: ["品牌", "Logo", "logo", "现代", "博客", "头像", "几何"] },
] as const;

type Profile = {
  era: AiIntent["eraHint"];
  script: SealDsl["script"];
  style: string;
  density: number;
  distress: AiIntent["distressHint"];
  border: AiIntent["borderHint"];
  mode: AiIntent["modeHint"];
  reason: AiReason;
};

const profiles: Record<StyleProfileCode, Profile> = {
  jiaguwen_shang: {
    era: "shang",
    script: "jiaguwen",
    style: "jiaguwen_shang",
    density: 0.58,
    distress: "medium",
    border: "irregular",
    mode: "yin",
    reason: { field: "eraHint", text: "甲骨文字形更接近上古书写气息，章法宜保留疏朗与不齐。", termSlugs: ["zhangfa"] },
  },
  jinwen_zhou: {
    era: "western_zhou",
    script: "jinwen",
    style: "jinwen_zhou",
    density: 0.66,
    distress: "slight",
    border: "single",
    mode: "yang",
    reason: { field: "eraHint", text: "金文字形圆厚舒展，适合用较稳的留白承托线条。", termSlugs: ["zhangfa"] },
  },
  guxi_warring_states: {
    era: "warring_states",
    script: "guxi",
    style: "guxi_warring_states",
    density: 0.61,
    distress: "medium",
    border: "irregular",
    mode: "yin",
    reason: { field: "eraHint", text: "古玺章法容许更自由的疏密与字位变化，适合古拙气质。", termSlugs: ["guxi", "zhangfa"] },
  },
  qin_formal: {
    era: "qin",
    script: "xiaozhuan",
    style: "qin_formal",
    density: 0.74,
    distress: "slight",
    border: "single",
    mode: "yin",
    reason: { field: "eraHint", text: "秦印取向强调方整与界格关系，适合克制、规整的构成。", termSlugs: ["qin-seal", "jiege"] },
  },
  han_private: {
    era: "han",
    script: "han_seal",
    style: "han_private",
    density: 0.82,
    distress: "slight",
    border: "thick",
    mode: "yin",
    reason: { field: "eraHint", text: "汉印式常见方整、宽博的章法，适合姓名与书画落款。", termSlugs: ["han-seal", "zhangfa", "mingzhang"] },
  },
  bird_worm_han_private: {
    era: "han",
    script: "bird_worm",
    style: "bird_worm_han_private",
    density: 0.69,
    distress: "slight",
    border: "single",
    mode: "yang",
    reason: { field: "eraHint", text: "鸟虫篆装饰性较强，宜控制残损并给曲折线条留出空间。", termSlugs: ["niaochong", "cansun"] },
  },
  literati_ming_qing: {
    era: "ming_qing",
    script: "xiaozhuan",
    style: "literati_ming_qing",
    density: 0.64,
    distress: "slight",
    border: "irregular",
    mode: "yang",
    reason: { field: "eraHint", text: "文人印取向更重视疏密节奏与个性化边栏，适合闲章和雅集场景。", termSlugs: ["xianzhang", "zhangfa", "yinbian"] },
  },
  modern_brand: {
    era: "modern",
    script: "xiaozhuan",
    style: "modern_brand",
    density: 0.7,
    distress: "none",
    border: "single",
    mode: "yang",
    reason: { field: "purpose", text: "数字标识需要缩小后仍清楚，因此采用清晰边界与低残损。", termSlugs: ["cansun", "yinbian"] },
  },
};

const eraProfiles: Record<AiIntent["eraHint"], StyleProfileCode> = {
  shang: "jiaguwen_shang",
  western_zhou: "jinwen_zhou",
  warring_states: "guxi_warring_states",
  qin: "qin_formal",
  han: "han_private",
  ming_qing: "literati_ming_qing",
  modern: "modern_brand",
};

export function groundedReasonsForIntent(
  intent: Pick<AiIntent, "eraHint" | "modeHint">,
): AiReason[] {
  const profile = profiles[eraProfiles[intent.eraHint]];
  return [
    profile.reason,
    {
      field: "modeHint",
      text: intent.modeHint === "yin"
        ? "白文以留红承托印文，整体分量更稳。"
        : "朱文保留连续红线，缩小使用时轮廓更清楚。",
      termSlugs: [intent.modeHint === "yin" ? "baiwen" : "zhuwen"],
    },
  ];
}

const genericSealTerms = new Set(["印章", "姓名", "名章", "闲章", "公章", "官印", "印", "章"]);
const quotePattern = /[“「『"']([^”」』"'\n]{1,16})[”」』"']/gu;
const unsafeOfficialPattern = /(公章|行政章|合同章|财务章|发票章|法人章|证照|证件|营业执照|身份证|组织机构章|政府印章|机关印章|官印)/iu;
const unsafeReplicaPattern = /(复刻|仿制|一比一|完全一样).{0,16}(大师|名家|印章|印鉴|公章|证照)/iu;

export type PromptSafetyResult =
  | { ok: true }
  | { ok: false; code: "OFFICIAL_IMPERSONATION" | "REPLICA_REQUEST"; message: string; suggestion: string };

export function normalizePrompt(prompt: string): string {
  return prompt.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function checkPromptSafety(prompt: string): PromptSafetyResult {
  const normalized = normalizePrompt(prompt);
  if (unsafeOfficialPattern.test(normalized)) {
    return {
      ok: false,
      code: "OFFICIAL_IMPERSONATION",
      message: "方寸不提供公章、官印或证照类印鉴的设计与仿制。",
      suggestion: "可以改为个人姓名章、斋号、闲章或不具凭信用途的品牌图形。",
    };
  }
  if (unsafeReplicaPattern.test(normalized)) {
    return {
      ok: false,
      code: "REPLICA_REQUEST",
      message: "方寸不提供一比一复刻名家作品或既有印鉴。",
      suggestion: "可以描述希望接近的章法、疏密、朱白与刀感特征。",
    };
  }
  return { ok: true };
}

function sanitizeSealText(value: string): string {
  return Array.from(value.replace(/[\s，。！？、；：,.!?;:]/gu, "")).slice(0, 8).join("");
}

function extractText(prompt: string): string | null {
  for (const match of prompt.matchAll(quotePattern)) {
    const text = sanitizeSealText(match[1] ?? "");
    if (text && !genericSealTerms.has(text)) return text;
  }
  const direct = prompt.replace(/[\s，。！？、；：,.!?;:]/gu, "");
  if (Array.from(direct).length <= 8 && /^[\p{Script=Han}A-Za-z0-9·]+$/u.test(direct)) return sanitizeSealText(direct);
  const named = prompt.match(/(?:印文|内容|文字)(?:是|为|用|写)?[：:]?([\p{Script=Han}A-Za-z0-9·]{1,8})/u)?.[1];
  const namedText = named ? sanitizeSealText(named) : "";
  return namedText && !genericSealTerms.has(namedText) ? namedText : null;
}

function matchProfile(prompt: string, purpose: AiIntent["purpose"]): StyleProfileCode {
  const matched = fallbackKeywordRules.find((rule) => rule.keywords.some((keyword) => prompt.includes(keyword)));
  if (matched) return matched.profile;
  if (purpose === "calligraphy_signature") return "han_private";
  if (purpose === "brand_logo") return "modern_brand";
  if (purpose === "tea_space" || purpose === "leisure") return "literati_ming_qing";
  if (purpose === "gift") return "qin_formal";
  return "han_private";
}

function inferPurpose(prompt: string): AiIntent["purpose"] {
  if (/(落款|姓名章|名章|书法|书画)/u.test(prompt)) return "calligraphy_signature";
  if (/(品牌|Logo|logo|博客|头像|标识)/u.test(prompt)) return "brand_logo";
  if (/(送给|礼物|祝寿|纪念)/u.test(prompt)) return "gift";
  if (/(茶室|茶席|茶馆|茶空间)/u.test(prompt)) return "tea_space";
  if (/(闲章|诗句|斋号)/u.test(prompt)) return "leisure";
  return "general";
}

function inferMoodTags(prompt: string): AiIntent["moodTags"] {
  const tags: AiIntent["moodTags"] = [];
  const rules: Array<[RegExp, AiIntent["moodTags"][number]]> = [
    [/(古朴|古拙|高古|上古)/u, "ancient"],
    [/(克制|端正|正式|平正)/u, "restrained"],
    [/(大气|厚重|雄浑|庄重)/u, "grand"],
    [/(孤寂|安静|清冷|静谧)/u, "quiet"],
    [/(雅致|清雅|清逸|诗意)/u, "elegant"],
    [/(疏朗|留白|轻盈)/u, "sparse"],
    [/(几何|现代|清晰|标识)/u, "geometric"],
  ];
  for (const [pattern, tag] of rules) if (pattern.test(prompt)) tags.push(tag);
  return tags;
}

function inferShape(prompt: string, fallback: AiIntent["shapeHint"]): AiIntent["shapeHint"] {
  if (/(圆印|圆形|椭圆)/u.test(prompt)) return "circle";
  if (/(长方|修长|长印)/u.test(prompt)) return "rect";
  if (/(方印|方形|方正)/u.test(prompt)) return "square";
  return fallback;
}

function inferMode(prompt: string, fallback: AiIntent["modeHint"]): AiIntent["modeHint"] {
  if (/(朱文|阳文)/u.test(prompt)) return "yang";
  if (/(白文|阴文)/u.test(prompt)) return "yin";
  return fallback;
}

function inferDistress(prompt: string, fallback: AiIntent["distressHint"]): AiIntent["distressHint"] {
  if (/(不要残损|无残损|完整|干净)/u.test(prompt)) return "none";
  if (/(重残|强残|斑驳|破损)/u.test(prompt)) return "strong";
  if (/(古朴|古拙|残损|苍茫)/u.test(prompt)) return "medium";
  if (/(微残|轻残|低残损)/u.test(prompt)) return "slight";
  return fallback;
}

function inferBorder(prompt: string, fallback: AiIntent["borderHint"]): AiIntent["borderHint"] {
  if (/(不要边框|无边框|去掉边框)/u.test(prompt)) return "none";
  if (/(厚边|粗边)/u.test(prompt)) return "thick";
  if (/(残边|不规则边|破边)/u.test(prompt)) return "irregular";
  if (/(清晰边框|细边|单边)/u.test(prompt)) return "single";
  return fallback;
}

function inferOutputUse(prompt: string, purpose: AiIntent["purpose"]): AiIntent["outputUse"] {
  if (/(刻制|上石|刻章|反字稿)/u.test(prompt)) return "carving";
  if (/(打印|印刷|落款|书法|书画)/u.test(prompt)) return "print";
  if (/SVG/iu.test(prompt)) return "svg";
  return purpose === "brand_logo" ? "svg" : "screen";
}

function inferSize(prompt: string, purpose: AiIntent["purpose"], previous?: AiIntent): number {
  const value = Number(prompt.match(/(\d{1,3}(?:\.\d+)?)\s*(?:mm|毫米)/iu)?.[1]);
  if (Number.isFinite(value)) return Math.min(120, Math.max(8, value));
  if (previous) return previous.sizeMmHint;
  if (purpose === "calligraphy_signature") return 20;
  if (purpose === "brand_logo") return 24;
  return 25;
}

export type ParsePromptResult =
  | { ok: true; intent: AiIntent; matchedProfile: StyleProfileCode }
  | { ok: false; code: "PROMPT_REQUIRED" | "TEXT_REQUIRED" | "UNSAFE_REQUEST"; message: string; suggestion: string };

export function parsePromptWithRules(prompt: string, previous?: AiIntent): ParsePromptResult {
  const normalized = normalizePrompt(prompt);
  if (!normalized) {
    return { ok: false, code: "PROMPT_REQUIRED", message: "请先描述想要的印文与使用场景。", suggestion: "例如：为书画落款设计一枚“听雨”姓名章。" };
  }
  const safety = checkPromptSafety(normalized);
  if (!safety.ok) return { ok: false, code: "UNSAFE_REQUEST", message: safety.message, suggestion: safety.suggestion };
  const text = extractText(normalized) ?? previous?.text ?? null;
  if (!text) {
    return { ok: false, code: "TEXT_REQUIRED", message: "我还不知道印章上要刻什么字。", suggestion: "请把 1–8 字印文放在引号中，例如“听雨”。" };
  }

  const purpose = inferPurpose(normalized) === "general" && previous ? previous.purpose : inferPurpose(normalized);
  const profileCode = matchProfile(normalized, purpose);
  const profile = profiles[profileCode];
  const moodTags = inferMoodTags(normalized);
  const explicitEra = fallbackKeywordRules.some((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  const intent = aiIntentSchema.parse({
    text,
    purpose,
    eraHint: explicitEra || !previous ? profile.era : previous.eraHint,
    moodTags: moodTags.length > 0 ? moodTags : previous?.moodTags ?? [],
    shapeHint: inferShape(normalized, previous?.shapeHint ?? "square"),
    modeHint: inferMode(normalized, previous?.modeHint ?? profile.mode),
    distressHint: inferDistress(normalized, previous?.distressHint ?? profile.distress),
    borderHint: inferBorder(normalized, previous?.borderHint ?? profile.border),
    sizeMmHint: inferSize(normalized, purpose, previous),
    outputUse: inferOutputUse(normalized, purpose),
    uncertain: explicitEra ? [] : ["eraHint"],
    reasons: groundedReasonsForIntent({
      eraHint: explicitEra || !previous ? profile.era : previous.eraHint,
      modeHint: inferMode(normalized, previous?.modeHint ?? profile.mode),
    }),
  });
  return { ok: true, intent, matchedProfile: profileCode };
}

const distressValues: Record<AiIntent["distressHint"], number> = {
  none: 0.04,
  slight: 0.16,
  medium: 0.34,
  strong: 0.56,
};

export type ResolveLogEntry = {
  field: string;
  action: "mapped" | "adjusted" | "defaulted";
  message: string;
};

export type ResolveIntentResult = {
  ok: true;
  dsl: SealDsl;
  resolveLog: ResolveLogEntry[];
};

export function resolveIntentToDsl(intentInput: unknown, seed?: number): ResolveIntentResult {
  const intent = aiIntentSchema.parse(intentInput);
  const profile = profiles[eraProfiles[intent.eraHint]];
  const characterCount = Array.from(intent.text).length;
  let density = profile.density;
  const resolveLog: ResolveLogEntry[] = [
    { field: "style", action: "mapped", message: `${intent.eraHint} → ${profile.style}` },
    { field: "script", action: "mapped", message: `${profile.style} → ${profile.script}` },
  ];
  if (intent.moodTags.includes("sparse")) {
    density -= 0.08;
    resolveLog.push({ field: "layout.density", action: "adjusted", message: "疏朗意图降低字面密度 0.08" });
  }
  if (intent.moodTags.includes("grand")) {
    density += 0.05;
    resolveLog.push({ field: "layout.density", action: "adjusted", message: "大气意图提高字面密度 0.05" });
  }
  const layout = characterCount >= 4 ? "grid_2x2" : characterCount === 3 ? "vertical_3" : characterCount === 2 ? "vertical_2" : "single";
  const normalized = normalizeSealDsl({
    text: intent.text,
    style: profile.style,
    script: profile.script,
    mode: intent.modeHint,
    shape: { type: intent.shapeHint, ratio: intent.shapeHint === "rect" ? 0.68 : 1 },
    layout: { strategy: layout, density, readingOrder: "traditional" },
    border: {
      type: intent.borderHint,
      width: intent.borderHint === "thick" ? 0.075 : 0.04,
      distress: distressValues[intent.distressHint] * 0.72,
    },
    impression: {
      distress: distressValues[intent.distressHint],
      inkUneven: Math.min(0.52, distressValues[intent.distressHint] * 0.72),
      bleed: intent.outputUse === "svg" ? 0.006 : 0.018,
      seed: seed ?? hashSeed(`${intent.text}:${profile.style}`),
    },
    physical: { sizeMm: intent.sizeMmHint },
  });
  if (!normalized.ok) throw new Error(normalized.errors.map((issue) => issue.message).join("；"));
  resolveLog.push(
    { field: "layout.strategy", action: "defaulted", message: `${characterCount} 字采用 ${layout}` },
    { field: "impression.distress", action: "mapped", message: `${intent.distressHint} → ${normalized.value.impression.distress}` },
  );
  return { ok: true, dsl: normalized.value, resolveLog };
}

export function sanitizeExplanation(text: string): string {
  const replaced = text
    .replace(/(复刻|完全一样|正宗)/gu, "接近其风格特征")
    .replace(/必须/gu, "通常")
    .replace(/唯一/gu, "常见");
  const sentences = replaced.match(/[^。！？]+[。！？]?/gu) ?? [];
  return sentences
    .filter((sentence) => !/(?:公元|出土于|发现于|\d{3,4}年|在世艺术家)/u.test(sentence))
    .slice(0, 2)
    .join("")
    .trim();
}

export function studioHrefFromDsl(dsl: SealDsl, candidate = 0): string {
  const params = new URLSearchParams({
    text: dsl.text,
    style: dsl.style,
    script: dsl.script,
    mode: dsl.mode,
    shape: dsl.shape.type,
    layout: dsl.layout.strategy,
    density: String(dsl.layout.density),
    readingOrder: dsl.layout.readingOrder,
    border: dsl.border.type,
    borderWidth: String(dsl.border.width),
    distress: String(dsl.impression.distress),
    inkUneven: String(dsl.impression.inkUneven),
    seed: String(dsl.impression.seed),
    candidate: String(candidate),
  });
  return `/studio?${params.toString()}`;
}

export class IntentCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number }>();

  constructor(
    private readonly ttlMs = 86_400_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }
}
