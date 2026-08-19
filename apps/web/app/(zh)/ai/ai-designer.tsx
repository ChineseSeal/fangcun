"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { studioHrefFromDsl, type AiIntent, type AiReason, type ResolveLogEntry } from "@fangcun/ai-designer";
import type { SealDsl } from "@fangcun/dsl-schema";
import { Icon } from "@/components/design-system/icons";
import { TermPopover } from "@/components/knowledge/term-popover";
import { eventNames, trackEvent } from "@/lib/events";
import styles from "./ai.module.css";

type Candidate = {
  candidateId: string;
  dsl: SealDsl;
  previewSvg: string;
  score: number;
  warnings: string[];
  missingGlyphs: string[];
};

type DesignResult = {
  advisorMode: "rules" | "model";
  providerModel?: string;
  fallbackReason?: string;
  cache: "hit" | "miss";
  intent: AiIntent;
  dsl: SealDsl;
  resolveLog: ResolveLogEntry[];
  candidates: Candidate[];
  engineVersion: string;
  assetVersion: string;
};

type Turn = {
  id: number;
  prompt: string;
  result: DesignResult;
};

type ApiError = {
  code?: string;
  message?: string;
  suggestion?: string;
};

const examples = [
  "给书法落款设计一枚“听雨”姓名章",
  "做一个适合博客 Logo 的“天眼”现代印章",
  "汉印风格的四字闲章“知足常乐”",
  "送给爷爷一枚古朴的“福寿康宁”印",
  "茶室用的雅致小印“清和”",
  "古玺风格的“日利”，越古朴越好",
] as const;

const scriptLabels: Record<SealDsl["script"], string> = {
  xiaozhuan: "小篆",
  han_seal: "汉印篆",
  guxi: "古玺",
  bird_worm: "鸟虫篆",
  jinwen: "金文",
  jiaguwen: "甲骨文",
};

const modeLabels: Record<SealDsl["mode"], string> = { yin: "白文", yang: "朱文" };
const shapeLabels: Record<SealDsl["shape"]["type"], string> = {
  square: "方印",
  rect: "长方印",
  circle: "圆印",
  ellipse: "椭圆印",
  freeform: "随形印",
};
const layoutLabels: Record<string, string> = {
  single: "单字居中",
  vertical_2: "两字纵排",
  vertical_3: "三字纵排",
  grid_2x2: "四字方格",
  horizontal_2: "两字横排",
  horizontal_3: "三字横排",
  ring: "环形章法",
  freeform: "自由章法",
  huiwen: "回文章法",
};
const borderLabels: Record<SealDsl["border"]["type"], string> = {
  none: "无边框",
  single: "细边",
  thick: "厚边",
  double: "双边",
  irregular: "不规则边",
  broken: "残边",
};
const candidateLabels = ["主方案", "朱白变化", "章法变化", "印蜕变化"] as const;
const termLabels: Record<string, string> = {
  baiwen: "白文",
  cansun: "残损",
  guxi: "古玺",
  "han-seal": "汉印",
  jiege: "界格",
  mingzhang: "名章",
  niaochong: "鸟虫篆",
  "qin-seal": "秦印",
  xianzhang: "闲章",
  yinbian: "印边",
  zhangfa: "章法",
  zhuwen: "朱文",
};

function ReasonTerms({ reason }: { reason: AiReason }) {
  return (
    <div className={styles.reason}>
      <p>{reason.text}</p>
      <span>
        {reason.termSlugs.map((slug) => (
          <TermPopover key={slug} slug={slug}>{termLabels[slug] ?? slug}</TermPopover>
        ))}
      </span>
    </div>
  );
}

export function AiDesigner({ providerConfigured }: { providerConfigured: boolean }) {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const turnCounter = useRef(0);
  const activeTurn = turns.find((turn) => turn.id === activeTurnId) ?? turns.at(-1);
  const activeResult = activeTurn?.result;
  const selected = activeResult?.candidates[selectedCandidate] ?? activeResult?.candidates[0];

  async function requestDesign(prompt: string, previousIntent?: AiIntent) {
    const normalized = prompt.trim();
    if (!normalized || status === "loading") return;
    setStatus("loading");
    setError(null);
    trackEvent(eventNames.aiPromptSubmitted, { hasContext: Boolean(previousIntent) });
    try {
      const response = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: normalized, ...(previousIntent ? { previousIntent } : {}) }),
      });
      const data = (await response.json()) as ({ ok: true } & DesignResult) | { ok: false; error?: ApiError };
      if (!data.ok) {
        setError(data.error ?? { message: "暂时无法生成建议。", suggestion: "请稍后重试。" });
        setStatus("error");
        return;
      }
      if (!response.ok) throw new Error("design response unavailable");
      turnCounter.current += 1;
      const turn = { id: turnCounter.current, prompt: normalized, result: data };
      setTurns((current) => [...current, turn].slice(-6));
      setActiveTurnId(turn.id);
      setSelectedCandidate(0);
      setMessage("");
      setStatus("idle");
      if (data.advisorMode === "rules" && data.fallbackReason) {
        trackEvent(eventNames.aiFallbackUsed, { cacheHit: data.cache === "hit", fallbackReason: data.fallbackReason });
      }
    } catch {
      setError({ message: "规则推荐服务没有响应。", suggestion: "已保留当前方案，请检查网络后重试。" });
      setStatus("error");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestDesign(message, activeResult?.intent);
  }

  return (
    <div className={styles.layout}>
      <section aria-label="AI 篆刻对话" className={`paper-panel ${styles.advisor}`}>
        <div className={styles.advisorHeading}>
          <span aria-hidden="true">方寸</span>
          <div>
            <h2>设计顾问</h2>
            <p>{providerConfigured ? "在线模型会接收本轮描述与印文；失败时自动切换本地规则。" : "当前使用本地规则推荐，不上传印文给外部模型。"}</p>
          </div>
        </div>

        <div aria-live="polite" className={styles.dialogue}>
          <div className={styles.aiMessage}>
            <p>告诉我印面要刻什么字，以及它将用在哪里。我会说明推荐依据，并把所有参数交给你确认。</p>
          </div>
          {turns.map((turn) => (
            <div className={styles.turn} key={turn.id}>
              <div className={styles.userMessage}><Icon name="user" /><p>{turn.prompt}</p></div>
              <div className={styles.aiMessage}>
                <p>已为“{turn.result.intent.text}”整理 {turn.result.candidates.length} 个可编辑方案。</p>
                {turn.id !== activeTurn?.id ? <button onClick={() => { setActiveTurnId(turn.id); setSelectedCandidate(0); }} type="button">恢复此轮方案</button> : <span>当前方案</span>}
              </div>
            </div>
          ))}
          {status === "loading" ? (
            <div aria-label="正在理解设计需求" className={styles.progress} role="status">
              <span>理解用途</span><span>匹配风格</span><span>校验章法</span>
            </div>
          ) : null}
          {error ? (
            <div className={styles.error} role="alert">
              <strong>{error.message ?? "无法生成建议"}</strong>
              <p>{error.suggestion ?? "请调整描述后重试。"}</p>
            </div>
          ) : null}
        </div>

        {turns.length === 0 ? (
          <div className={styles.examples}>
            <p>可以从这些描述开始</p>
            <div>{examples.map((example) => <button key={example} onClick={() => setMessage(example)} type="button">{example}</button>)}</div>
          </div>
        ) : null}

        <form className={styles.composer} onSubmit={submit}>
          <label htmlFor="ai-prompt">描述你想要的气质、用途或时代感</label>
          <textarea id="ai-prompt" maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder={activeResult ? "继续调整，例如：再疏朗一点，不要边框" : "例如：为个人博客设计一枚古朴的“天眼”印"} value={message} />
          <footer>
            <small>{message.length}/500</small>
            <button aria-label="发送设计需求" disabled={!message.trim() || status === "loading"} type="submit"><Icon name="send" />生成建议</button>
          </footer>
        </form>
        <p className={styles.disclaimer}>规则或模型只负责理解需求；印面始终由 Seal DSL 与 Seal Engine 生成。</p>
      </section>

      <section aria-label="AI 生成方案" className={`paper-panel ${styles.results}`}>
        {activeResult && selected ? (
          <>
            <div className={styles.resultHeading}>
              <div>
                <span>{activeResult.advisorMode === "model" ? "在线模型" : "规则推荐"} · {activeResult.cache === "hit" ? "意图缓存已复用" : "新意图"}</span>
                <h2>为“{activeResult.intent.text}”整理的方案</h2>
              </div>
              <button className="outline-button" disabled={status === "loading"} onClick={() => void requestDesign(activeTurn.prompt, activeResult.intent)} type="button"><Icon name="shuffle" />换一组印蜕</button>
            </div>

            <article className={styles.mainProposal}>
              <div aria-label={`${activeResult.intent.text}${candidateLabels[selectedCandidate] ?? "候选"}预览`} className={styles.mainArtwork} dangerouslySetInnerHTML={{ __html: selected.previewSvg }} role="img" />
              <div className={styles.mainCopy}>
                <span>{candidateLabels[selectedCandidate] ?? `方案 ${selectedCandidate + 1}`} · 匹配度 {Math.round(selected.score * 100)}%</span>
                <h3>{scriptLabels[selected.dsl.script]} · {modeLabels[selected.dsl.mode]} · {layoutLabels[selected.dsl.layout.strategy] ?? "自定义章法"}</h3>
                <div className={styles.reasons}>{activeResult.intent.reasons.map((reason) => <ReasonTerms key={`${reason.field}-${reason.text}`} reason={reason} />)}</div>
                {activeResult.intent.uncertain.length > 0 ? <p className={styles.uncertain}>部分风格字段是顾问推测项，可在工作台继续调整。</p> : null}
                <div className={styles.mainActions}>
                  <Link className="primary-button" href={studioHrefFromDsl(selected.dsl)} onClick={() => trackEvent(eventNames.aiRecommendationApplied, { candidateIndex: selectedCandidate, advisorMode: activeResult.advisorMode })}><Icon name="edit" />确认并进入工作台</Link>
                  <Link href={`/create?text=${encodeURIComponent(activeResult.intent.text)}&style=${encodeURIComponent(selected.dsl.style)}&mode=${selected.dsl.mode}`}>先比较生成器 <Icon name="arrow" /></Link>
                </div>
              </div>
            </article>

            <div aria-label="其他候选方案" className={styles.candidateRail}>
              {activeResult.candidates.map((candidate, index) => (
                <button aria-label={`选择${candidateLabels[index] ?? `方案${index + 1}`}`} aria-pressed={selectedCandidate === index} className={selectedCandidate === index ? styles.candidateActive : styles.candidate} key={candidate.candidateId} onClick={() => setSelectedCandidate(index)} type="button">
                  <span dangerouslySetInnerHTML={{ __html: candidate.previewSvg }} />
                  <strong>{candidateLabels[index] ?? `方案 ${index + 1}`}</strong>
                </button>
              ))}
            </div>

            <details className={styles.params}>
              <summary>查看完整参数与解析记录</summary>
              <dl>
                <div><dt>印式</dt><dd>{shapeLabels[selected.dsl.shape.type]} · {selected.dsl.physical.sizeMm}mm</dd></div>
                <div><dt>篆体</dt><dd>{scriptLabels[selected.dsl.script]}</dd></div>
                <div><dt>朱白</dt><dd>{modeLabels[selected.dsl.mode]}</dd></div>
                <div><dt>章法</dt><dd>{layoutLabels[selected.dsl.layout.strategy] ?? selected.dsl.layout.strategy}</dd></div>
                <div><dt>边框</dt><dd>{borderLabels[selected.dsl.border.type]}</dd></div>
                <div><dt>残损</dt><dd>{Math.round(selected.dsl.impression.distress * 100)}%</dd></div>
                <div><dt>Seed</dt><dd>{selected.dsl.impression.seed}</dd></div>
                <div><dt>引擎 / 字形</dt><dd>{activeResult.engineVersion} / {activeResult.assetVersion}</dd></div>
              </dl>
              <ol>{activeResult.resolveLog.map((entry) => <li key={`${entry.field}-${entry.message}`}><code>{entry.field}</code><span>{entry.message}</span></li>)}</ol>
            </details>
          </>
        ) : (
          <div className={styles.emptyResult}>
            <div aria-hidden="true"><Icon name="stamp" size={42} /></div>
            <span>等待你的描述</span>
            <h2>建议不会自动改动项目</h2>
            <p>结果会先展示推荐理由、候选印面和完整 DSL 摘要。只有点击确认后，才会带参数进入工作台。</p>
            <dl><div><dt>01</dt><dd>提取印文与用途</dd></div><div><dt>02</dt><dd>模型或规则匹配风格</dd></div><div><dt>03</dt><dd>服务端合规与 DSL 校验</dd></div></dl>
          </div>
        )}
      </section>
    </div>
  );
}
