export type TermCategory = "mode" | "style" | "layout" | "form" | "material" | "process";

export type TermSeed = {
  slug: string;
  nameZh: string;
  pinyinZh: string;
  category: TermCategory;
  oneLinerZh: string;
  refs: readonly string[];
  relatedSlugs: readonly string[];
  cta: { labelZh: string; href: string };
};

const pinyinBySlug: Record<string, string> = {
  zhuwen: "zhū wén",
  baiwen: "bái wén",
  manbai: "mǎn bái",
  xizhuwen: "xì zhū wén",
  guxi: "gǔ xǐ",
  "han-seal": "hàn yìn",
  "qin-seal": "qín yìn",
  niaochong: "niǎo chóng zhuàn",
  miuzhuan: "móu zhuàn",
  zhangfa: "zhāng fǎ",
  jiege: "jiè gé",
  huiwen: "huí wén",
  jiebian: "jiè biān",
  yinbian: "yìn biān",
  bianfankuan: "biān kuǎn",
  yinniu: "yìn niǔ",
  yinni: "yìn ní",
  qianyin: "qián yìn",
  yintui: "yìn tuì",
  tapian: "tà piàn",
  cansun: "cán sǔn",
  feibai: "fēi bái",
  fanzi: "fǎn zì",
  shangshi: "shàng shí",
  chongdao: "chōng dāo",
  qiedao: "qiē dāo",
  xianzhang: "xián zhāng",
  mingzhang: "míng zhāng",
  yinpu: "yìn pǔ",
  qingtian: "qīng tián shí",
};

function lessonFor(category: TermCategory): string {
  if (category === "mode") return "zhu-bai";
  if (category === "style" || category === "layout") return "zhangfa";
  return "dao-yintui";
}

const refs = ["TECH §31.6"] as const;
const publishedWikiSlugs = new Set([
  "zhuwen",
  "baiwen",
  "han-seal",
  "guxi",
  "zhangfa",
  "bianfankuan",
  "yinni",
  "qianyin",
  "xianzhang",
  "mingzhang",
  "cansun",
  "jiege",
]);

function term(
  slug: string,
  nameZh: string,
  category: TermCategory,
  oneLinerZh: string,
  relatedSlugs: readonly string[] = [],
): TermSeed {
  return {
    slug,
    nameZh,
    pinyinZh: pinyinBySlug[slug] ?? nameZh,
    category,
    oneLinerZh,
    refs,
    relatedSlugs,
    cta: publishedWikiSlugs.has(slug)
      ? { labelZh: "查看百科", href: "/academy/wiki/" + slug }
      : { labelZh: "了解更多", href: "/academy/lesson/" + lessonFor(category) + "?term=" + slug },
  };
}

export const termSeeds = [
  term("zhuwen", "朱文", "mode", "印文凸起，钤出后字为红色、底为白色。又称阳文。", ["baiwen"]),
  term("baiwen", "白文", "mode", "印文凹陷，钤出后字为白色、底为红色。又称阴文。", ["zhuwen", "manbai"]),
  term("manbai", "满白", "mode", "白文的一种，笔画粗、留红少，整体近乎满红。", ["baiwen"]),
  term("xizhuwen", "细朱文", "mode", "朱文的一种，笔画细劲，留白疏朗，元明以后多见。", ["zhuwen"]),
  term("guxi", "古玺", "style", "先秦尤其战国印章传统，文字、形制与章法呈现地域差异。", ["han-seal"]),
  term("han-seal", "汉印", "style", "汉代印章传统，常见方整布局与白文，官私印仍有差异。", ["qin-seal", "baiwen"]),
  term("qin-seal", "秦印", "style", "秦代印章，多带界格，布局规整，介于古玺与汉印之间。", ["guxi", "jiege"]),
  term("niaochong", "鸟虫篆", "style", "笔画作鸟虫形的装饰性篆书，多见于战国至汉的私印。", ["guxi"]),
  term("miuzhuan", "缪篆", "style", "汉代印章专用的篆书体，笔画平直方折，便于填满印面。", ["han-seal"]),
  term("zhangfa", "章法", "layout", "印面上文字的排列与疏密安排，是篆刻的整体设计。", ["jiege", "huiwen"]),
  term("jiege", "界格", "layout", "印面内的分隔线，用于区分字位与稳定读序。", ["qin-seal", "zhangfa"]),
  term("huiwen", "回文", "layout", "四字印的一种读序：右上、右下、左上、左下。", ["zhangfa"]),
  term("jiebian", "借边", "layout", "字形与边框相接或共用一笔，使章法更紧凑。", ["yinbian", "zhangfa"]),
  term("yinbian", "印边", "form", "印面外围的框线，朱文为实线，白文为留红外圈。", ["jiebian"]),
  term("bianfankuan", "边款", "form", "刻在印章侧面的文字，记录作者、时间或诗句。", ["yinniu"]),
  term("yinniu", "印钮", "form", "印章顶部的雕饰，如龟钮、瓦钮，兼具穿绳与身份标识。", ["bianfankuan"]),
  term("yinni", "印泥", "material", "红色膏状钤印材料，常由朱砂类颜料、油料与纤维调制。", ["qianyin", "yintui"]),
  term("qianyin", "钤印", "process", "把印章蘸印泥后按压在纸上的动作。", ["yinni", "yintui"]),
  term("yintui", "印蜕", "process", "印章钤在纸上留下的痕迹，是印章的“照片”。", ["qianyin", "cansun"]),
  term("tapian", "拓片", "process", "用墨拓取器物或边款上文字的方法，黑底白字。", ["bianfankuan"]),
  term("cansun", "残损", "process", "印蜕中笔画、边栏或色块的局部缺失，成因需结合实物判断。", ["feibai", "yintui"]),
  term("feibai", "飞白", "process", "笔画中的断续白痕，来自刀刻的力度与石质。", ["cansun"]),
  term("fanzi", "反字", "process", "刻印前写在石上的镜像字稿，钤出后才是正字。", ["shangshi"]),
  term("shangshi", "上石", "process", "把印稿转写到印石表面的步骤。", ["fanzi", "chongdao"]),
  term("chongdao", "冲刀", "process", "刀锋沿笔画方向推进的刻法，线条爽利。", ["qiedao"]),
  term("qiedao", "切刀", "process", "刀锋分段下切的刻法，线条含蓄有波折。", ["chongdao"]),
  term("xianzhang", "闲章", "form", "内容为诗句、成语或吉语的印章，不用于署名。", ["mingzhang"]),
  term("mingzhang", "名章", "form", "刻姓名或字号的印章，用于书画署名与凭信。", ["xianzhang"]),
  term("yinpu", "印谱", "form", "汇集印蜕并装订成册的书，是学习篆刻的主要资料。", ["yintui"]),
  term("qingtian", "青田石", "material", "浙江青田所产印石，质地细腻易刻，为常用印材。", ["yinni"]),
] as const satisfies readonly TermSeed[];

export type LinkedTermSegment = { text: string; slug?: string };

export function linkTerms(
  text: string,
  options: { maxPerParagraph?: number; exclude?: readonly string[] } = {},
): LinkedTermSegment[] {
  const maxPerParagraph = Math.max(0, options.maxPerParagraph ?? 3);
  const excluded = new Set(options.exclude ?? []);
  const candidates = termSeeds
    .filter((term) => term.nameZh.length >= 2 && !excluded.has(term.slug))
    .slice()
    .sort((left, right) => right.nameZh.length - left.nameZh.length);
  const seen = new Set<string>();
  const segments: LinkedTermSegment[] = [];
  let plain = "";
  let linked = 0;

  for (let index = 0; index < text.length;) {
    const match = linked < maxPerParagraph
      ? candidates.find((term) => !seen.has(term.slug) && text.startsWith(term.nameZh, index))
      : undefined;
    if (!match) {
      plain += text[index] ?? "";
      index += 1;
      continue;
    }
    if (plain) {
      segments.push({ text: plain });
      plain = "";
    }
    segments.push({ text: match.nameZh, slug: match.slug });
    seen.add(match.slug);
    linked += 1;
    index += match.nameZh.length;
  }
  if (plain) segments.push({ text: plain });
  return segments;
}
