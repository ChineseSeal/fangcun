import { termSeeds, type TermCategory } from "./terms";

export type WikiReference = {
  title: string;
  author: string;
  year: string;
  url: string;
};

export type WikiSection = {
  heading: string;
  paragraphs: readonly string[];
};

export type WikiSealExample = {
  labelZh: string;
  captionZh: string;
  dsl: {
    text: string;
    mode: "yin" | "yang";
    style: string;
    script: "xiaozhuan" | "han_seal" | "guxi" | "bird_worm";
    layout?: {
      strategy: "single" | "vertical_2" | "grid_2x2";
      density: number;
      readingOrder: "traditional" | "huiwen" | "modern";
    };
    border?: {
      type: "none" | "single" | "thick" | "double" | "irregular" | "broken";
      width: number;
      distress: number;
      corner: number;
    };
    grid?: {
      type: "none" | "jie" | "tian" | "ri";
      width: number;
    };
    impression?: {
      distress: number;
      inkUneven: number;
      bleed: number;
      seed: number;
    };
  };
};

export type WikiEntry = {
  slug: string;
  nameZh: string;
  pinyinZh: string;
  termEn: string;
  termEnGloss: string;
  aliases: readonly string[];
  category: TermCategory;
  oneLinerZh: string;
  sections: readonly WikiSection[];
  misconceptionZh: string;
  relatedSlugs: readonly string[];
  lessonSlugs: readonly string[];
  references: readonly WikiReference[];
  certainty: "high" | "medium";
  examples: readonly [WikiSealExample, WikiSealExample];
  status: "published";
  updatedAt: string;
};

const palaceGuxi: WikiReference = {
  title: "白玉鼻钮‘絑□’印",
  author: "故宫博物院·方斌",
  year: "未载",
  url: "https://www.dpm.org.cn/collection/seal/229680.html",
};

const palaceHanSeal: WikiReference = {
  title: "白玉羊钮‘应衢’印",
  author: "故宫博物院·方斌",
  year: "未载",
  url: "https://www.dpm.org.cn/collection/seal/229623.html",
};

const palaceInscription: WikiReference = {
  title: "从黄易的几则印款说起",
  author: "故宫博物院",
  year: "未载",
  url: "https://www.dpm.org.cn/study_detail/100158.html",
};

const metSealCarving: WikiReference = {
  title: "The Art of Seal Carving",
  author: "The Metropolitan Museum of Art",
  year: "2010",
  url: "https://www.metmuseum.org/exhibitions/listings/2010/xie-zhiliu",
};

const jiangsuXianzhang: WikiReference = {
  title: "闲章趣话",
  author: "江苏省纪委监委",
  year: "2016",
  url: "https://www.jssjw.gov.cn/art/2016/12/16/art_437_31474.html",
};

const guangzhouSealCulture: WikiReference = {
  title: "一印千年痕",
  author: "广州市人民代表大会常务委员会",
  year: "2022",
  url: "https://www.gzrd.gov.cn/ztzl/tjxsdrdjgljwhjs/ljwh/202208/t20220825_77668975.html",
};

const ministrySealStandard: WikiReference = {
  title: "印章印文鉴定规范",
  author: "中华人民共和国司法部",
  year: "2021",
  url: "https://www.moj.gov.cn/pub/sfbgw/zwfw/zwfwbgxz/202101/P020210122423060898623.pdf",
};

const britishMuseumPrivateSeal: WikiReference = {
  title: "Jade private seal",
  author: "The British Museum",
  year: "未载",
  url: "https://www.britishmuseum.org/collection/object/A_1885-1227-68",
};

const baseTerms = new Map(termSeeds.map((term) => [term.slug, term]));

function example(
  labelZh: string,
  captionZh: string,
  text: string,
  mode: "yin" | "yang",
  script: WikiSealExample["dsl"]["script"],
  seed: number,
  options: Pick<WikiSealExample["dsl"], "style" | "layout" | "border" | "grid" | "impression">,
): WikiSealExample {
  return {
    labelZh,
    captionZh,
    dsl: {
      text,
      mode,
      script,
      style: options.style,
      layout: options.layout,
      border: options.border,
      grid: options.grid,
      impression: options.impression ?? {
        distress: 0.12,
        inkUneven: 0.08,
        bleed: 0.008,
        seed,
      },
    },
  };
}

function entry(
  slug: string,
  details: Omit<WikiEntry, "slug" | "nameZh" | "pinyinZh" | "category" | "oneLinerZh" | "status" | "updatedAt">,
): WikiEntry {
  const base = baseTerms.get(slug);
  if (!base) throw new Error(`Unknown wiki term: ${slug}`);
  return {
    slug,
    nameZh: base.nameZh,
    pinyinZh: base.pinyinZh,
    category: base.category,
    oneLinerZh: base.oneLinerZh,
    ...details,
    status: "published",
    updatedAt: "2026-08-11",
  };
}

const standardLayout = {
  strategy: "vertical_2",
  density: 0.74,
  readingOrder: "traditional",
} as const;

const standardBorder = {
  type: "single",
  width: 0.045,
  distress: 0.12,
  corner: 0.015,
} as const;

export const wikiEntries = [
  entry("zhuwen", {
    termEn: "relief inscription",
    termEnGloss: "red-character seal style",
    aliases: ["阳文"],
    sections: [
      { heading: "怎样形成", paragraphs: ["印面保留文字笔画，刻去笔画周围的空地。蘸印泥钤出后，文字呈红色，空地保留纸色。", "朱文说的是印面与印蜕的正负关系，不限定某一种朝代或篆书字体。"] },
      { heading: "如何识别", paragraphs: ["先看印蜕中文字是否着色，再观察线条与边框怎样呼应。细线朱文常显疏朗，粗线朱文也可以形成厚重的满构图。"] },
    ],
    misconceptionZh: "朱文不等于小篆。朱文是刻法与印蜕效果，小篆是文字体系，两者可以组合，也可以分别出现。",
    relatedSlugs: ["baiwen", "xizhuwen", "yinbian"],
    lessonSlugs: ["zhu-bai"],
    references: [palaceGuxi, metSealCarving],
    certainty: "high",
    examples: [
      example("朱文印蜕", "字红底白，观察凸起文字形成的红线。", "方寸", "yang", "xiaozhuan", 411, { style: "xiaozhuan", layout: standardLayout, border: standardBorder }),
      example("白文对照", "保持文字与布局，只切换印式。", "方寸", "yin", "xiaozhuan", 411, { style: "xiaozhuan", layout: standardLayout, border: standardBorder }),
    ],
  }),
  entry("baiwen", {
    termEn: "intaglio inscription",
    termEnGloss: "white-character seal style",
    aliases: ["阴文"],
    sections: [
      { heading: "怎样形成", paragraphs: ["刀刻进入文字笔画，印面上的字呈凹槽。钤印时空地着红，凹下的文字不接触纸面，因此在印蜕中呈白色。"] },
      { heading: "历史与识别", paragraphs: ["白文在秦汉印章中常见。识别时以印蜕中字是否留白为准，不以数字预览里背景面积的多少单独判断。"] },
    ],
    misconceptionZh: "白文并不是使用白色印泥，也不表示印章材质为白色；名称来自钤印后文字留白的视觉结果。",
    relatedSlugs: ["zhuwen", "manbai", "han-seal"],
    lessonSlugs: ["zhu-bai"],
    references: [palaceHanSeal, metSealCarving, ministrySealStandard],
    certainty: "high",
    examples: [
      example("白文印蜕", "字白底红，留意文字的负形。", "方寸", "yin", "han_seal", 512, { style: "han_seal", layout: standardLayout, border: { ...standardBorder, type: "thick" } }),
      example("朱文对照", "保持其他参数不变，对照正负关系。", "方寸", "yang", "han_seal", 512, { style: "han_seal", layout: standardLayout, border: { ...standardBorder, type: "thick" } }),
    ],
  }),
  entry("han-seal", {
    termEn: "Han seal",
    termEnGloss: "seal tradition of the Han period",
    aliases: ["汉印式"],
    sections: [
      { heading: "面貌从哪里来", paragraphs: ["汉印常以方整的印面容纳平直、盘曲的篆书笔画，文字彼此照应，整体趋向平满。官印、私印与不同时段仍存在丰富差异。"] },
      { heading: "如何识别", paragraphs: ["可同时观察方形边界、白文比例、字格安排与笔画转折。单看某一个方折笔画，不能直接断定年代。"] },
    ],
    misconceptionZh: "“汉印风格”是创作归纳，不代表数字作品就是汉代文物；判断实物年代还需要材质、制度、文字与考古信息。",
    relatedSlugs: ["baiwen", "miuzhuan", "zhangfa"],
    lessonSlugs: ["zhangfa"],
    references: [palaceHanSeal, metSealCarving],
    certainty: "high",
    examples: [
      example("方整平满", "四字分区紧凑，展示汉印式的整体秩序。", "安乐延寿", "yin", "han_seal", 613, { style: "han_seal", layout: { strategy: "grid_2x2", density: 0.84, readingOrder: "traditional" }, border: { ...standardBorder, type: "thick" } }),
      example("疏朗对照", "降低密度后，对照字与边界之间的留红。", "安乐延寿", "yin", "han_seal", 613, { style: "han_seal", layout: { strategy: "grid_2x2", density: 0.58, readingOrder: "traditional" }, border: standardBorder }),
    ],
  }),
  entry("guxi", {
    termEn: "ancient seal",
    termEnGloss: "pre-Qin seal tradition",
    aliases: ["战国玺", "先秦古玺"],
    sections: [
      { heading: "历史范围", paragraphs: ["古玺通常指先秦、尤其战国时期的印章传统。各地文字与形制差异明显，印面可见方、圆及不规则边界，布局也比后世规整印式更活泼。"] },
      { heading: "如何识别", paragraphs: ["应把文字来源、印面形制、边栏与读序放在一起判断。数字创作可借鉴其疏密与错落，但不应把“做旧”当成历史证据。"] },
    ],
    misconceptionZh: "古玺不是所有古代印章的统称。语境不明时，应说明所指年代与文字来源。",
    relatedSlugs: ["qin-seal", "han-seal", "niaochong"],
    lessonSlugs: ["zhangfa"],
    references: [palaceGuxi],
    certainty: "high",
    examples: [
      example("错落古玺", "不规则边栏与较疏密度形成古玺式节奏。", "日利", "yin", "guxi", 714, { style: "guxi", layout: { ...standardLayout, density: 0.61 }, border: { ...standardBorder, type: "irregular", distress: 0.28 } }),
      example("规整对照", "改用单边框与较高密度，比较整体气息。", "日利", "yin", "guxi", 714, { style: "guxi", layout: { ...standardLayout, density: 0.82 }, border: standardBorder }),
    ],
  }),
  entry("zhangfa", {
    termEn: "seal composition",
    termEnGloss: "spatial organization of a seal face",
    aliases: ["印面章法"],
    sections: [
      { heading: "安排什么", paragraphs: ["章法处理字与字、字与边、红与白之间的关系。读序、字格、疏密、重心和边栏共同决定一方印从远处看是否完整。"] },
      { heading: "怎样观察", paragraphs: ["先眯眼看整体块面，再逐字检查避让与呼应。比较方案时每次只改变一个变量，更容易看出密度或边栏带来的影响。"] },
    ],
    misconceptionZh: "章法不只是把字平均放进格子。均匀是一种选择，错落、借边与局部留空也能建立秩序。",
    relatedSlugs: ["jiege", "huiwen", "jiebian"],
    lessonSlugs: ["zhangfa"],
    references: [palaceGuxi, palaceHanSeal, metSealCarving],
    certainty: "high",
    examples: [
      example("紧密章法", "字面趋于平满，边界参与构图。", "清风明月", "yin", "han_seal", 815, { style: "han_seal", layout: { strategy: "grid_2x2", density: 0.86, readingOrder: "traditional" }, border: { ...standardBorder, type: "thick" } }),
      example("疏朗章法", "同文同式降低密度，比较留红与重心。", "清风明月", "yin", "han_seal", 815, { style: "han_seal", layout: { strategy: "grid_2x2", density: 0.54, readingOrder: "traditional" }, border: standardBorder }),
    ],
  }),
  entry("bianfankuan", {
    termEn: "side inscription",
    termEnGloss: "inscription carved on a seal body",
    aliases: ["印款", "边刻"],
    sections: [
      { heading: "记录什么", paragraphs: ["边款刻在印章侧面，可记作者、时间、受赠者、刻制缘起，也可录诗文与品评。它与正面的印文共同构成作品信息。"] },
      { heading: "怎样阅读", paragraphs: ["实物可转动观察，出版物中常以拓片展示。阅读时要区分正面印蜕、侧面文字与后人的题签或著录。"] },
    ],
    misconceptionZh: "并非每方印都带边款；没有边款也不能据此判断作品早晚或真伪。",
    relatedSlugs: ["tapian", "yinniu", "yinpu"],
    lessonSlugs: ["dao-yintui"],
    references: [palaceInscription],
    certainty: "high",
    examples: [
      example("正面印文", "先辨认正面印蜕，它与侧面边款是两个观看面。", "听雨", "yang", "xiaozhuan", 916, { style: "xiaozhuan", layout: standardLayout, border: standardBorder }),
      example("白文正面", "同一印文可有不同印式，边款并不决定正面印式。", "听雨", "yin", "xiaozhuan", 916, { style: "xiaozhuan", layout: standardLayout, border: standardBorder }),
    ],
  }),
  entry("yinni", {
    termEn: "seal paste",
    termEnGloss: "pigment paste used for seal impressions",
    aliases: ["印色"],
    sections: [
      { heading: "基本构成", paragraphs: ["传统红色印泥以朱砂类颜料、油料与纤维等调制，使颜料能附着印面并稳定转移到纸上。配方与保存状态会影响色泽和黏稠度。"] },
      { heading: "使用与保存", paragraphs: ["蘸取时让印面均匀着泥，避免用力挤压造成文字间积泥。印泥应防尘、避热，并按产品说明翻调。"] },
    ],
    misconceptionZh: "颜色越鲜并不自动代表品质越高；清晰度还取决于印面、蘸泥、纸张和按压方式。",
    relatedSlugs: ["qianyin", "yintui", "cansun"],
    lessonSlugs: ["dao-yintui"],
    references: [metSealCarving, guangzhouSealCulture],
    certainty: "high",
    examples: [
      example("均匀印色", "低起伏参数下，笔画边缘较清楚。", "方寸", "yang", "xiaozhuan", 1017, { style: "xiaozhuan", layout: standardLayout, border: standardBorder, impression: { distress: 0.06, inkUneven: 0.04, bleed: 0.006, seed: 1017 } }),
      example("起伏对照", "提高墨色起伏，观察局部浓淡，不把它等同于年代。", "方寸", "yang", "xiaozhuan", 1017, { style: "xiaozhuan", layout: standardLayout, border: standardBorder, impression: { distress: 0.08, inkUneven: 0.58, bleed: 0.014, seed: 1017 } }),
    ],
  }),
  entry("qianyin", {
    termEn: "seal stamping",
    termEnGloss: "the act of making a seal impression",
    aliases: ["用印"],
    sections: [
      { heading: "基本过程", paragraphs: ["钤印是让印面均匀蘸取印泥，再垂直、稳定地压到纸上的过程。印面大小、纸张软硬与承托都会改变转印结果。"] },
      { heading: "观察结果", paragraphs: ["清楚的印蜕应让主要字形与边界可辨。局部深浅可以保留手工感，但大面积糊塞或缺失会妨碍识读。"] },
    ],
    misconceptionZh: "用力更大不一定更清楚。压力不均或移动印章，反而可能造成重影、糊边与积泥。",
    relatedSlugs: ["yinni", "yintui", "cansun"],
    lessonSlugs: ["dao-yintui"],
    references: [guangzhouSealCulture, metSealCarving],
    certainty: "high",
    examples: [
      example("稳定钤印", "低残损、低渗化，主要结构完整。", "清和", "yin", "han_seal", 1118, { style: "han_seal", layout: standardLayout, border: standardBorder, impression: { distress: 0.05, inkUneven: 0.06, bleed: 0.004, seed: 1118 } }),
      example("移动感对照", "参数模拟的是视觉结果，不替代真实钤印练习。", "清和", "yin", "han_seal", 1118, { style: "han_seal", layout: standardLayout, border: standardBorder, impression: { distress: 0.26, inkUneven: 0.34, bleed: 0.032, seed: 1118 } }),
    ],
  }),
  entry("xianzhang", {
    termEn: "leisure seal",
    termEnGloss: "non-name seal carrying a phrase or sentiment",
    aliases: ["词句印", "吉语印"],
    sections: [
      { heading: "内容与用途", paragraphs: ["闲章通常不刻姓名，而选用诗文、成语、吉语或斋馆相关文字，表达志趣与心境。书画上可用它补充署名印之外的语义与构图。"] },
      { heading: "如何选择", paragraphs: ["先让词句与作品主题相合，再考虑尺寸、印式和落印位置。含义、语气与画面重量应彼此协调。"] },
    ],
    misconceptionZh: "“闲”不等于随意。词句出处、使用场景与画面位置仍需要认真核对。",
    relatedSlugs: ["mingzhang", "zhangfa", "qianyin"],
    lessonSlugs: ["zhangfa"],
    references: [jiangsuXianzhang, metSealCarving, britishMuseumPrivateSeal],
    certainty: "high",
    examples: [
      example("词句闲章", "四字词句形成独立语义。", "知足常乐", "yang", "xiaozhuan", 1219, { style: "xiaozhuan", layout: { strategy: "grid_2x2", density: 0.71, readingOrder: "traditional" }, border: standardBorder }),
      example("短句闲章", "二字内容适合较小的补景印。", "听雨", "yang", "guxi", 1219, { style: "guxi", layout: standardLayout, border: { ...standardBorder, type: "irregular" } }),
    ],
  }),
  entry("mingzhang", {
    termEn: "name seal",
    termEnGloss: "personal seal bearing a name",
    aliases: ["姓名章", "私名印"],
    sections: [
      { heading: "基本用途", paragraphs: ["名章以个人姓名、名号或相关署名文字为主体，用作身份标识与书画署款。具体法律效力取决于使用场景与当地规则。"] },
      { heading: "书画中的搭配", paragraphs: ["名章常与题款相邻，也可能与字号、斋馆或闲章组合。落印前要同时考虑文字含义、印面大小和画面空白。"] },
    ],
    misconceptionZh: "艺术名章不自动等同于合同、金融或行政场景中的法定印鉴；正式用途应遵循相应规范。",
    relatedSlugs: ["xianzhang", "qianyin", "zhangfa"],
    lessonSlugs: ["zhangfa"],
    references: [ministrySealStandard, metSealCarving],
    certainty: "high",
    examples: [
      example("二字名章", "姓名文字占据主体，采用白文示例。", "王印", "yin", "han_seal", 1320, { style: "han_seal", layout: standardLayout, border: { ...standardBorder, type: "thick" } }),
      example("朱文对照", "同一姓名切换印式，比较画面重量。", "王印", "yang", "xiaozhuan", 1320, { style: "xiaozhuan", layout: standardLayout, border: standardBorder }),
    ],
  }),
  entry("cansun", {
    termEn: "wear and loss",
    termEnGloss: "missing or interrupted parts in an impression",
    aliases: ["残破", "破边"],
    sections: [
      { heading: "看见了什么", paragraphs: ["残损是印蜕中笔画、边栏或色块的局部缺失。它可能与印面状态、印泥、纸张接触和钤印过程有关，需要结合实物判断。"] },
      { heading: "数字模拟", paragraphs: ["数字工具可用固定种子复现缺口与起伏，帮助比较方案。模拟应先保证字形可读，再控制缺失的位置和程度。"] },
    ],
    misconceptionZh: "残损越重并不代表越古。把随机缺口当作年代证明，会混淆视觉风格与文物判断。",
    relatedSlugs: ["feibai", "yintui", "yinni"],
    lessonSlugs: ["dao-yintui"],
    references: [palaceGuxi, metSealCarving],
    certainty: "medium",
    examples: [
      example("轻度残损", "主要字形与边栏保持完整。", "古拙", "yin", "guxi", 1421, { style: "guxi", layout: standardLayout, border: { ...standardBorder, type: "irregular", distress: 0.18 }, impression: { distress: 0.16, inkUneven: 0.12, bleed: 0.008, seed: 1421 } }),
      example("重度对照", "同一随机种子提高缺失比例，便于比较。", "古拙", "yin", "guxi", 1421, { style: "guxi", layout: standardLayout, border: { ...standardBorder, type: "broken", distress: 0.7 }, impression: { distress: 0.68, inkUneven: 0.42, bleed: 0.012, seed: 1421 } }),
    ],
  }),
  entry("jiege", {
    termEn: "compartment grid",
    termEnGloss: "dividing lines inside a seal face",
    aliases: ["界画", "格线"],
    sections: [
      { heading: "起什么作用", paragraphs: ["界格是印面内部的分隔线，可帮助区分字位、稳定读序，并让各字形成相对独立的空间。秦印等传统中可见不同分格方式。"] },
      { heading: "常见形态", paragraphs: ["二字可用日字格，四字可用田字格或十字分界。格线的粗细要与边栏、笔画协调，避免抢夺文字。"] },
    ],
    misconceptionZh: "有分格线不一定就是秦印；年代与风格判断还要结合文字、制度、材质和出土信息。",
    relatedSlugs: ["qin-seal", "zhangfa", "huiwen"],
    lessonSlugs: ["zhangfa"],
    references: [palaceGuxi, palaceHanSeal],
    certainty: "high",
    examples: [
      example("田字界格", "四字印用横竖格线明确字位。", "天地之印", "yin", "xiaozhuan", 1522, { style: "qin_seal", layout: { strategy: "grid_2x2", density: 0.68, readingOrder: "traditional" }, border: standardBorder, grid: { type: "tian", width: 0.018 } }),
      example("无界格对照", "去掉格线后，比较字与字之间的联系。", "天地之印", "yin", "xiaozhuan", 1522, { style: "qin_seal", layout: { strategy: "grid_2x2", density: 0.68, readingOrder: "traditional" }, border: standardBorder, grid: { type: "none", width: 0.018 } }),
    ],
  }),
] as const satisfies readonly WikiEntry[];

export function findWikiEntry(slug: string): WikiEntry | undefined {
  return wikiEntries.find((candidate) => candidate.slug === slug);
}

export const wikiEntrySlugs = wikiEntries.map((item) => item.slug);
