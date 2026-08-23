# 方寸 Fangcun · 技术文档（Technical Architecture & Seal Engine Design）

> **方寸之间，自有天地。**

| 项目 | 内容 |
|---|---|
| 文档名称 | 方寸 Fangcun 技术架构、数据库与 Seal Engine 算法设计文档 |
| 文档版本 | V2.0 |
| 上一版本 | V1.0（26 节 + 附录 A/B/C） |
| 阅读对象 | 前端 / 后端 / 算法 / 数据 / DevOps |
| 关联文档 | [产品需求文档 PRD.md](PRD.md) · [设计文档 DESIGN.md](DESIGN.md) |

**V2.0 变更说明**：本版本在 V1.0 基础上**只做结构补全与内容增补，未删除任何技术设计**。主要新增：

1. 新增 **第 20 章 知识内容系统技术架构**——术语库、小百科、标注层、小测、成就的数据模型与 API（对应 PRD 第 10 章）；
2. 新增 **第 22 章 边款、印谱与刻制辅助**、**第 23 章 合规检查器**、**第 26 章 国际化与内容本地化**；
3. 补全 DSL Schema 全量字段定义、错误码表、缓存键规范、引擎 `explain` 输出契约；
4. 附录扩充为 A–F：表结构、算法伪代码、验收指标、DSL 完整 Schema、错误码表、术语库种子数据。
5. 补齐 **GSAP 动效与 three.js / React Three Fiber 3D 架构**：包含 React 生命周期、SSR 边界、按需加载、性能预算、测试与渐进降级。

**章节编号约定**：PRD.md 已引用 `TECH.md §7`（Glyph 资产）与 `TECH.md §20`（术语库数据结构），本文档章节号与之严格对齐，后续修订不得改动这两章编号。

---

## 目录

1. [技术目标与架构原则](#1-技术目标与架构原则)
2. [MVP 技术范围](#2-mvp-技术范围)
3. [总体系统架构](#3-总体系统架构)
4. [推荐技术栈](#4-推荐技术栈)
5. [领域模块拆分](#5-领域模块拆分)
6. [数据模型与数据库](#6-数据模型与数据库)
7. [Glyph 字形资产体系](#7-glyph-字形资产体系)
8. [Seal DSL 设计](#8-seal-dsl-设计)
9. [Seal Engine 总体管线](#9-seal-engine-总体管线)
10. [章法 Layout Engine](#10-章法-layout-engine)
11. [字形变形 Glyph Transform](#11-字形变形-glyph-transform)
12. [印式与边框 Border Engine](#12-印式与边框-border-engine)
13. [印蜕与残损 Distress Engine](#13-印蜕与残损-distress-engine)
14. [印泥与纸张渲染](#14-印泥与纸张渲染)
15. [SVG 渲染与导出](#15-svg-渲染与导出)
16. [AI 篆刻师技术架构](#16-ai-篆刻师技术架构)
17. [历史风格 Style Profile](#17-历史风格-style-profile)
18. [API 设计](#18-api-设计)
19. [项目保存、版本与随机种子](#19-项目保存版本与随机种子)
20. [知识内容系统技术架构](#20-知识内容系统技术架构)
21. [搜索、字典与印库数据架构](#21-搜索字典与印库数据架构)
22. [边款、印谱与刻制辅助](#22-边款印谱与刻制辅助)
23. [合规检查器](#23-合规检查器)
24. [性能、缓存与任务调度](#24-性能缓存与任务调度)
25. [安全、版权与数据治理](#25-安全版权与数据治理)
26. [国际化与内容本地化](#26-国际化与内容本地化)
27. [测试策略](#27-测试策略)
28. [可观测性与质量指标](#28-可观测性与质量指标)
29. [部署与 CI/CD](#29-部署与-cicd)
30. [开发里程碑](#30-开发里程碑)
31. [附录](#31-附录)

---

# 1. 技术目标与架构原则

## 1.1 技术核心

方寸的技术核心不是"把一个字体字符画成红色"，而是将**文字资产、历史风格、章法规则、矢量变形和真实印蜕渲染**组织成一套**可复现、可编辑、可导出**的 Seal Engine。

该引擎应同时服务：Web 编辑器、AI 篆刻师、未来开放 API 与批量渲染。

## 1.2 六条架构原则

| 原则 | 工程要求 |
|---|---|
| **SVG First** | 核心印面必须保持矢量语义；PNG / PDF 是派生输出 |
| **Deterministic** | 相同 DSL + seed 必须得到同一印章结果，便于保存、协作、API 与测试 |
| **Data-driven** | 历史风格通过 Style Profile 数据配置，不把大量规则写死在 UI |
| **Progressive Complexity** | MVP 先规则化布局和轻量残损，再逐步增加复杂字形与算法 |
| **Client-first Preview** | 大部分交互预览在浏览器即时完成，服务端负责持久化、高质量导出和重任务 |
| **AI as Parameterizer** | LLM 只负责把自然语言转成约束 / 参数，最终几何结果由 Seal Engine 生成 |

## 1.3 第七条原则（V2.0 新增）

| 原则 | 工程要求 |
|---|---|
| **Knowledge as Data** | 印章知识（术语、词条、标注、解释）是**结构化数据**，不是散落在组件里的文案。同一条知识只存一份，被浮层、词条页、课程正文、AI 解释、alt 文本复用 |

**这条原则的直接后果**：

- 术语库是一张表（`wiki_terms`），不是 i18n 文案文件；
- AI 生成的"因为落款章多取汉印方正"这句理由，其中的"汉印"必须能被解析为 `term_slug: han-seal` 并渲染成浮层；
- 印章的自动风格解读（DESIGN.md 10.5"说明"面板）由引擎输出结构化 `explain` 对象，不是前端拼字符串。

## 1.4 不做的技术选择

| 不做 | 原因 |
|---|---|
| 用位图管线做核心渲染 | 违反 SVG First，无法导出可编辑矢量 |
| 用 `Math.random()` | 违反 Deterministic，项目无法复现 |
| 让 LLM 直接输出 SVG / 坐标 | 不可控、不可复现、几何质量不可保证 |
| 把 Style Profile 写成 if-else | 无法由内容团队维护，无法 A/B |
| 服务端渲染每一次滑块拖动 | 延迟不可接受 |
| 把知识文案硬编码在 React 组件 | 违反 Knowledge as Data，无法多语言、无法复用 |

---

# 2. MVP 技术范围

## 2.1 引擎能力范围

- **1–4 个汉字**；预留 1–8 字数据结构；
- **印式**：方、圆；预留长方、椭圆、随形；
- **文字体系**：小篆、汉印篆、古玺，至少提供高频字符和 Variant；
- **朱文 / 白文**；
- **6 种章法模板** + 自动推荐；
- 字形级**缩放、平移、轻旋转、Variant 替换**；
- **单 / 粗 / 残边**三类边框；
- 可调**残损、飞白、边缘缺口、印泥不均**；使用稳定随机 seed；
- 浏览器 **SVG 预览**；**PNG、透明 PNG、SVG** 导出；
- **项目保存、Undo/Redo、版本快照**。

## 2.2 知识系统 MVP 范围（V2.0 新增）

| 能力 | MVP | 延后 |
|---|---|---|
| 术语库 | 30 条种子术语，支持 slug 查询 | 60+ 条、多语言 |
| 小百科词条页 | 12 条，SSG 静态生成 | ISR + 编辑后台 |
| 引擎风格解读 `explain` | 输出朱白 / 风格 / 布局三项 | 全参数解读 |
| 术语识别（文本 → 术语链接） | 基于词典的最长匹配 | 上下文消歧 |
| 印面标注层数据 | 引擎输出 `annotations[]` | 历史印人工标注 |
| 小测 | 静态 JSON 题库 | 数据库 + 出题接口 |
| 成就 | 延后至 V1.1 | — |

## 2.3 非阻塞项

> **高精度 3D 石章、真实盖印 / 物理雕刻仿真、CNC / DXF、完整博物馆级印库、复杂社区、多人实时协作**均放到后续版本。V1 可交付按需加载的轻量 3D 查看器，但它不阻塞核心 SVG 生成与导出。

新增非阻塞项（V2.0）：边款拓片渲染、印谱排版 PDF、教育机构批量账号、知识内容协作编辑后台。

---

# 3. 总体系统架构

## 3.1 核心业务链路

```
Next.js Web  →  Seal Engine (TS)  →  API / BFF  →  PostgreSQL  →  Object Storage
```

## 3.2 AI 生成链路

```
用户 Prompt  →  LLM Parser  →  Seal DSL  →  Constraint Resolver  →  Seal Engine
```

## 3.3 知识内容链路（V2.0 新增）

```
Seal Engine explain[]  ┐
Glyph / Style 元数据    ├→  Knowledge Resolver  →  术语浮层 / 知识卡 / 标注层 / alt 文本
wiki_terms 表          ┘
```

`Knowledge Resolver` 是一个纯函数模块，输入是"当前上下文"（DSL、字形来源、历史印元数据），输出是"应该展示哪些知识条目"。它**不做网络请求**——术语库在构建期打包为静态字典（30–60 条，约 20KB gzip），保证浮层零延迟。

## 3.4 混合架构说明

> 推荐采用"**浏览器可执行的核心引擎 + 服务端权威渲染**"的混合架构。

Seal Engine 的核心几何逻辑优先使用 **TypeScript 编写为共享 package**，使前端预览和服务端 Node Worker 得到一致结果；如果后期重计算明显增多，可将**路径布尔运算 / 高精度导出**迁移至 Rust/WASM 或 Go 服务，但 **DSL 与算法合同保持不变**。

### 3.4.1 执行位置矩阵

| 任务 | 浏览器 | 服务端 | 说明 |
|---|---|---|---|
| DSL normalize / validate | ✓ | ✓ | 同一份代码，两端都跑 |
| 布局生成与评分 | ✓ | ✓ | 客户端优先，弱设备降级到服务端 |
| 字形变换 | ✓ | ✓ | |
| 朱白布尔运算 | ✓（PathKit WASM） | ✓ | |
| 残损 mask 生成 | ✓（预览精度） | ✓（导出精度） | 精度不同但 seed 相同 |
| SVG 序列化 | ✓ | ✓ | |
| 高分辨率 PNG（≥ 4000px） | 可选 OffscreenCanvas | ✓ 权威 | 大图任务化 |
| PDF / EPS | — | ✓ | |
| 轻量 3D 预览 | ✓ | 可选预生成贴图 / GLTF | 客户端 R3F；失败降级 SVG 海报 |
| 3D 真实盖印 | ✓（V3） | — | 最终印蜕仍由 Seal Engine 确定性生成 |
| AI 解析 | — | ✓ | LLM 调用不暴露在客户端 |
| 合规检查 | ✓（快速预检） | ✓ **权威** | 客户端仅提示，服务端才是准 |

**关键约束**：客户端与服务端渲染同一 DSL + seed 必须产生**几何一致**的结果（允许残损 mask 采样精度不同，但宏观形态一致）。由 `rebuild_consistency` 指标监控（见 28.1）。

---

# 4. 推荐技术栈

| 层 | 推荐 | 说明 |
|---|---|---|
| **Web** | Next.js + React + TypeScript | SEO 内容页与编辑器统一项目；App Router |
| **UI** | Tailwind CSS + 自有 Design Tokens | 工具界面、响应式、主题 |
| **SVG** | 原生 SVG DOM + svg-path 工具库 | 核心编辑语义 |
| **字体解析** | opentype.js（仅辅助） | 读取字体轮廓；最终优先自有 Glyph Path |
| **路径几何** | Paper.js / PathKit(WASM) 评估 | 布尔、偏移、简化、交集 |
| **状态** | Zustand / Redux Toolkit 二选一 | 编辑器状态、Undo/Redo |
| **Animation** | GSAP + `@gsap/react` + ScrollTrigger | DOM / SVG 时间线、滚动叙事、盖印动画；React 内统一使用 `useGSAP` |
| **3D** | three.js + `@react-three/fiber` + `@react-three/drei` | 石章模型、材质、相机与交互；Canvas 仅在用户需要时加载 |
| **数据库** | PostgreSQL | 结构化元数据、搜索索引 |
| **对象存储** | S3 / R2 等 | SVG 资源、预览图、历史印图 |
| **队列** | 轻量任务队列，V1 可暂缓 | 批量导出、缩略图、AI 后处理 |
| **AI** | 支持结构化 JSON 输出的 LLM | 自然语言 → DSL，不参与最终像素生成 |
| **部署** | Vercel / Cloudflare + 托管 Postgres 均可 | 优先快速迭代；后期按负载拆分 |

## 4.1 补充选型（V2.0 新增）

| 层 | 推荐 | 说明 |
|---|---|---|
| **DSL 校验** | Zod / JSON Schema (ajv) | 前后端共用一份 schema，见附录 D |
| **确定性随机** | 自实现 `mulberry32` / `xoshiro128**` | **禁止 `Math.random()`**；需跨端逐位一致 |
| **哈希** | `xxhash-wasm` 或 FNV-1a | seed 派生、资产 hash、缓存键 |
| **噪声** | 自实现 simplex / value noise（seed 可控） | 残损 mask |
| **知识内容** | MDX（课程）+ PostgreSQL（术语 / 词条） | 课程需内嵌交互组件，术语需结构化查询 |
| **搜索** | PostgreSQL `pg_trgm` + `tsvector` | 数据量大后再上专用搜索服务 |
| **测试** | Vitest（单元）+ Playwright（E2E / 视觉回归） | |
| **Monorepo** | pnpm workspace + Turborepo | 见 29.1 |

## 4.2 关键依赖的风险与替代

| 依赖 | 风险 | 替代 / 缓解 |
|---|---|---|
| PathKit (WASM) | 约 300KB gzip，首屏加载成本 | 懒加载，仅在需要布尔运算时（白文 / 借边）载入；朱文简单路径不需要 |
| Paper.js | 体积大、API 面向 Canvas | 仅取几何部分，或改用 `js-angusj-clipper` |
| opentype.js | 只用于资产导入流水线 | **不进入生产 bundle**，仅在数据工具中使用 |
| GSAP / ScrollTrigger | 动画实例未清理会在路由切换后继续运行 | React 统一使用 `useGSAP({ scope })`；异步回调使用 `contextSafe`；卸载自动 revert |
| three.js / R3F / drei | 包体、GPU 占用与 WebGL 兼容性 | 组件级动态导入、drei 按需引用、静止场景 `frameloop="demand"`、SVG 海报降级 |
| LLM 供应商 | 可用性、成本、输出漂移 | Schema 强约束 + 本地规则推荐兜底（见 16.6） |

## 4.3 动画与 3D 实现边界

### 4.3.1 React + GSAP

- GSAP 只在 Client Component 生命周期内执行；SSR 阶段不得调用 `gsap.to()`、ScrollTrigger 或读取 DOM；
- 使用 `@gsap/react` 的 `useGSAP()`，为每个页面 / 组件传入容器 ref 作为 `scope`；
- 多步骤动效使用 `gsap.timeline()` 与 label，不用多段 `setTimeout` / `delay` 拼接；
- ScrollTrigger 注册一次；只在有滚动叙事的路由加载，动态内容完成布局后调用 `ScrollTrigger.refresh()`；
- 响应式与减少动效使用 `gsap.matchMedia()`；交互中的新 tween 使用 `overwrite: "auto"` 或 `quickTo()`，避免输入时动画排队；
- 只动画 transform / opacity / 必要的 CSS 变量；不以 React state 驱动逐帧位置。

推荐组件模式：

```tsx
"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function SealIntro() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.timeline({ defaults: { ease: "power2.out" } })
        .from("[data-seal-glyph]", { autoAlpha: 0, y: 16, duration: 0.45 })
        .from("[data-seal-mark]", { autoAlpha: 0, scale: 0.97, duration: 0.3 }, "-=0.12");
    }, root);
    return () => mm.revert();
  }, { scope: root });

  return <div ref={root}>{/* ... */}</div>;
}
```

### 4.3.2 React Three Fiber

3D 是 Seal DSL 的派生视图，数据方向固定为：

```text
Seal DSL → Seal Engine SVG → 3D Adapter → Geometry / Texture → R3F Scene
                       └──────────────────────────────→ 静态 SVG 海报（降级）
```

| 阶段 | 实现 |
|---|---|
| V1 轻量预览 | 方 / 圆印章主体使用基础几何；Seal SVG 栅格化为高分辨率 CanvasTexture，配合 roughness / normal 表达印面；不做逐字布尔挖刻 |
| V2 增强预览 | 印式决定截面；边款生成侧面纹理 / 凹凸贴图；材质参数数据化并按需生成确定性纹理；可缓存 GLTF / KTX2 派生产物 |
| V3 真实盖印 | R3F 驱动相机与石章，印蜕仍由 Seal Engine 确定性生成；纸面压痕、印泥渗开用视觉近似，不让物理引擎决定最终作品 |

工程约束：

- `Canvas` 使用动态导入且 `ssr: false`；加载前渲染相同尺寸的 SVG poster；
- 静态查看器用 `frameloop="demand"`，交互 / 转场时 `invalidate()`；真实盖印模式才临时连续渲染；
- 相机、mesh、material 通过 ref 更新，不在 `useFrame` 内 `setState()`；
- 标准视角以 scoped `useGSAP()` 更新相机位置，目标切换使用 `overwrite: "auto"`；减少动效时直接设置目标位置；
- 材质只改变 3D PBR 展示，`physical.sizeMm` 与 `physical.material` 都不得反向覆盖 Seal Engine SVG 或刻制导出几何；
- 历史印只在存在结构化馆藏尺寸与材质时启用 3D；Adapter 可接收受信的 `dimensionsMm` / `knobVariant` 覆盖并按最长边归一化视图，但事实面板仍显示原始毫米值；
- 历史印钮式只允许映射到通用 `plain` / `rounded` / `arched` 近似，并返回 `HISTORIC_MODEL_APPROXIMATED` / `HISTORIC_KNOB_APPROXIMATED`；界面必须声明不是扫描、测绘、复原或鉴定模型；
- DPR 桌面限制为 `1…2`，移动端限制为 `1…1.5`；阴影和贴图分级；
- `visibilitychange`、路由离开和 Canvas 离开视口时暂停渲染；纹理 / geometry / material 在卸载时释放；
- WebGL 初始化失败、上下文丢失、低性能模式或 `saveData` 开启时，立即使用 SVG 海报；
- 3D 不进入 SEO 首屏 HTML、打印与导出事实链；2D SVG 仍是唯一权威几何。

---

# 5. 领域模块拆分

| 模块 | 职责 |
|---|---|
| **Identity** | 用户、授权、套餐、API Key（后期） |
| **Project** | Seal 项目、版本、收藏、导出记录 |
| **Glyph Catalog** | 字形、Variant、来源、路径、标签 |
| **Style Catalog** | 历史风格 Profile、默认参数、约束 |
| **Layout Engine** | 候选章法生成、评分、约束求解 |
| **Seal Renderer** | 印式、边框、朱白、路径合成 |
| **Distress Engine** | 残损、飞白、印泥、扩散、seed |
| **Export** | SVG / PNG / PDF 等输出 |
| **Dictionary** | 字形搜索、字源内容、SEO |
| **Historic Seals** | 历史印数据与风格映射 |
| **AI Designer** | Prompt 解析、参数推荐、解释 |
| **Gallery** | 发布、收藏、Remix、审核 |

## 5.1 新增模块（V2.0）

| 模块 | 职责 |
|---|---|
| **Knowledge** | 术语库、小百科词条、知识卡触发规则、术语识别与链接化、印面标注数据 |
| **Quiz** | 题库、判题、结果、分享卡 |
| **Achievement** | 成就定义、条件判定、发放（V1.1） |
| **Inscription** | 边款文字排布、侧面展开、拓片渲染 |
| **Album** | 印谱版面、分页、题跋、PDF 输出 |
| **Carving Aid** | 真实尺寸换算、反字稿、石料建议、1:1 打印稿 |
| **Compliance** | 印文与形制合规检查、申诉流转 |

## 5.2 模块依赖方向

```
              ┌──────────────┐
              │ Seal Engine  │  ← 纯函数，无 IO，不依赖任何上层
              └──────┬───────┘
                     │
      ┌──────────────┼──────────────┐
┌─────▼────┐  ┌──────▼─────┐  ┌────▼──────┐
│  Glyph   │  │   Style    │  │ Knowledge │  ← 数据目录层，只读
│ Catalog  │  │  Catalog   │  │           │
└──────────┘  └────────────┘  └───────────┘
                     │
      ┌──────────────┼──────────────┬────────────┐
┌─────▼────┐  ┌──────▼─────┐  ┌────▼─────┐ ┌────▼─────┐
│ Project  │  │ AI Designer│  │  Export  │ │Compliance│  ← 应用层
└──────────┘  └────────────┘  └──────────┘ └──────────┘
```

**硬性约束**：

1. `Seal Engine` 不得 import 任何数据库 / 网络 / 文件系统模块。它接收已加载的 Glyph 与 Style 数据作为参数；
2. `Knowledge` 只被 UI 层与 AI 层消费，**引擎不依赖知识模块**——引擎只输出结构化事实，由 Knowledge 层翻译成人话；
3. `Compliance` 在引擎之前执行，不进入几何管线。

---

# 6. 数据模型与数据库

## 6.1 核心设计原则

> 数据库保存的是"**可重建印章**"的参数和资产引用，而不是只保存一张最终 PNG。所有项目都应能通过 `project_version.seal_dsl + engine_version + asset_version + seed` 重建。

## 6.2 核心实体

| 实体 | 关键字段 |
|---|---|
| `users` | `id, profile, plan, locale, created_at` |
| `seal_projects` | `id, user_id, title, current_version_id, visibility` |
| `seal_versions` | `id, project_id, seal_dsl_json, seed, engine_version, created_at` |
| `glyphs` | `id, character, unicode, script, canonical_metrics` |
| `glyph_variants` | `id, glyph_id, svg_path/object_key, source_id, era, metrics, tags` |
| `style_profiles` | `id, code, era, parameters_json, constraints_json` |
| `historic_seals` | `id, title, era, text, type, institution, image/object_key, metadata` |
| `exports` | `id, version_id, format, options_json, object_key, status` |
| `gallery_posts` | `id, owner_id, project_id/version_id, title, dsl, engine_version, glyph_asset_version, remix_source_id, status` |
| `gallery_reports` | `id, post_id, reporter_id, reason, detail, status, reviewer_id, reviewer_note, reviewed_at` |
| `gallery_appeals` | `id, post_id, appellant_id, reason, status, reviewer_id, reviewer_note, reviewed_at` |
| `gallery_review_events` | `id, post_id, subject_type/id, reviewer_id, from_status, to_status, note, created_at` |
| `gallery_collections` | `id, owner_id, title, description, visibility, created_at` |
| `gallery_collection_items` | `collection_id, post_id, added_at` |

## 6.3 新增实体（V2.0）

| 实体 | 关键字段 | 用途 |
|---|---|---|
| `wiki_terms` | `id, slug, term_zh, term_en, aliases[], one_liner, body_md, refs, related_slugs[], updated_at` | **术语库，见 §20** |
| `wiki_media` | `id, term_slug, kind(compare/diagram), asset_key, caption` | 词条示意图 |
| `academy_lessons` | `id, track, slug, title, body_mdx, order, published_at` | 学院课程 |
| `quiz_items` | `id, set_slug, kind, prompt, options, answer, explain, asset_key` | 小测题库 |
| `quiz_attempts` | `id, user_id, set_slug, score, answers_json, created_at` | 答题记录（可匿名） |
| `achievements` | `id, code, name, seal_text, condition_json` | 成就定义 |
| `user_achievements` | `user_id, achievement_code, earned_at` | 成就发放 |
| `seal_annotations` | `id, historic_seal_id, kind, geometry_json, term_slug, note` | 历史印人工标注 |
| `inscriptions` | `id, version_id, side, text, script, knife_style, params_json` | 边款 |
| `albums` / `album_items` | `id, user_id, title, layout, page_size` / `album_id, project_id + version_id` 或 `historic_seal_slug`, `page, slot` | 账户私有印谱 |
| `compliance_reviews` | `id, subject_type, subject_id, rule_code, decision, appealed_at, resolved_at` | 合规与申诉 |
| `asset_sources` | `id, name, kind(museum/catalog/self), license, url, accessed_at` | 来源与授权 |

## 6.4 关键关系与约束

| 约束 | 说明 |
|---|---|
| `seal_versions.dsl` 不可变 | 版本一经写入不再修改；"编辑"产生新版本 |
| `seal_projects.current_version_id` | 外键指向 `seal_versions`，回滚只改指针并新建版本 |
| `glyph_variants.asset_hash` | 资产内容哈希，用于 CDN 缓存键与变更检测 |
| `glyph_variants.version` | 资产版本号，`seal_versions.asset_version` 记录当时使用的整体版本 |
| `wiki_terms.slug` | 唯一，且为 URL 路径（`/wiki/:slug`），发布后不得更改（改名需加 alias 重定向） |
| `historic_seals.source_id` | **非空外键**指向 `asset_sources`，无来源的历史印不得上线 |
| `visibility` | 默认 `private`，公开需用户主动操作 |
| `gallery_posts` | 提交时固定完整 DSL / Engine / Glyph 版本；`pending`、`rejected`、`removed` 均不公开，只有 `published` 可被公开读取 |
| `gallery_reports` | 举报内容只写入审核队列，普通用户没有读取权限 |
| `gallery_appeals` | 作者仅能为自己的 `rejected` / `removed` 作品提交一次 5–500 字申诉；申诉独立于作品状态 |
| `gallery_review_events` | 审核动作只追加审计事件；普通用户不拥有读取、写入或更新权限 |
| `gallery_collections` | 默认 `private`；公开必须由创建者明确选择；合集只保存已发布 `gallery_posts.id` 的引用，不复制 DSL、Glyph 或作者数据 |
| `gallery_collection_items` | `(collection_id, post_id)` 唯一；只有合集所有者可添加 / 删除，且目标必须仍是 `published` |

## 6.5 软删除与保留期

| 对象 | 策略 |
|---|---|
| `seal_projects` | 软删除，`deleted_at` 非空后 30 天物理清理（对应 DESIGN.md 回收站） |
| `seal_versions` | **不删除**（除非项目物理清理），保证历史可重建 |
| `exports` | 对象存储文件 90 天后清理，记录保留 |
| `quiz_attempts` | 匿名记录 180 天，登录用户长期保留 |
| `gallery_posts` | 下架为状态变更，非删除，便于申诉 |

## 6.6 索引建议

| 表 | 索引 |
|---|---|
| `glyphs` | `(character)`、`(unicode)`、`(script, character)` |
| `glyph_variants` | `(glyph_id, script)`、GIN `(tags)` |
| `seal_versions` | `(project_id, created_at DESC)` |
| `historic_seals` | `(era)`、GIN `(metadata)`、GIN `to_tsvector(title || inscription)` |
| `wiki_terms` | `(slug)` unique、GIN `(aliases)` |
| `exports` | `(version_id, format)`、`(status, created_at)` |
| `gallery_posts` | 部分索引 `(published_at DESC, created_at DESC)`、`(owner_id, created_at DESC)`、`(owner_id, published_at DESC, id DESC) WHERE status = 'published'`、`(remix_source_id)` |
| `gallery_creator_profiles` | `owner_id` 主键；公开笔名与可选简介，不存储或复制 Auth 邮箱 |
| `gallery_collections` | `(owner_id, created_at DESC)`、公开合集部分索引 `(created_at DESC) WHERE visibility = 'public'` |
| `gallery_collection_items` | `(collection_id, post_id)` 主键、`(post_id)` |

## 6.7 R7 P2 Gallery 审核与合集（当前实现）

迁移 `20260814030233_gallery_review_foundation.sql`、`20260814071144_gallery_review_workbench.sql` 与 `20260814082418_gallery_review_queue_rpc.sql` 已创建作品、举报、申诉和不可变审核事件。作品发布不是图片上传：从本地项目的一个不可变版本写入完整 DSL、Engine 与 Glyph Asset 版本，并以 `(owner_id, version_id)` 去重。普通用户没有 `UPDATE` / `DELETE` 权限；审核只改变状态，绝不改写快照。

`gallery_posts` 开启 RLS：匿名和登录用户只能读取 `published` 行，作者额外可读取自己的待审行；登录用户只能插入自己所有、`pending` 且没有审核结论的作品。`gallery_reports` 同样开启 RLS：登录用户只能为已发布作品插入自己的单条举报，举报没有面向普通用户的 `SELECT` 权限。作者可读取自己的申诉，只能为自己的 `rejected` / `removed` 作品插入一次待处理申诉；普通用户无审核事件的任何表权限。未配置 Supabase 时，Gallery 只展示明确标注的策展示例，不伪造公开作品或发布结果。

`/review`、`/en/review` 与 `/api/gallery/review` 是唯一审核入口。服务器先以 bearer token 调用 Supabase `auth.getUser()`，只接受不可由用户资料改写的 `app_metadata.gallery_reviewer === true`，拒绝匿名会话和 `user_metadata` 声明；随后才创建仅存在于服务器内存的 service-role client。service role 没有 Gallery 表的直接读写授权，只能执行受限 RPC：`get_gallery_review_dashboard()` 读取待审作品、公开作品、未处理举报和申诉，`apply_gallery_review()` 在同一事务内锁定对象、校验状态迁移、更新状态并追加事件。`pending → published/rejected`、`published → removed`、`rejected/removed → published`；举报为 `open → resolved/dismissed`，申诉为 `pending → accepted/rejected`。驳回或下架必须附 5–500 字说明；接受申诉不会自动重新公开作品。`SUPABASE_SERVICE_ROLE_KEY` 只能配置在服务端，绝不进入 `NEXT_PUBLIC_*`、客户端包或日志。

Remix 不是复制字形：从已发布作品创建新项目时，只继承印式、书体、章法、边框、界格、印蜕、印泥、纸张和实物参数；新印文重新生成 Glyph，并在 DSL `meta.remixOf` 写入不可移除的 `gallery:<post-id>`。数据库外键与检查约束要求该引用和 `remix_source_id` 一致。

迁移 `20260814085908_gallery_collections.sql` 新增私人收藏与公开合集。`gallery_collections` 与 `gallery_collection_items` 都启用 RLS 并显式授予最小表权限：匿名用户只能读取 `public` 合集及其条目；登录用户可读取自己的私有合集、创建 / 删除自己的合集，并只可向自己的合集添加已发布作品。新建合集和第一枚作品通过 security-invoker `create_gallery_collection_with_item()` 在同一事务写入；函数仅授予 `authenticated`，并在迁移末尾刷新 PostgREST schema。合集详情始终从已审核的 `gallery_posts` 快照派生，不复制 Seal DSL；不提供点赞、关注或排名。迁移 `20260814113242_gallery_published_pagination.sql` 为 `published_at DESC, id DESC` 增加局部索引；Gallery 每次最多返回 12 枚已审核作品加一条探针，只有用户点击“加载更多”才读取下一页，末页不再显示入口。

迁移 `20260814115906_gallery_creator_profiles.sql` 新增用户显式创建的公开资料：仅 `owner_id`、1–40 字 `display_name`、可选 280 字 `bio` 与时间戳，绝不从 `auth.users`、邮箱或 JWT 元数据复制身份字段。表开启 RLS 并显式授予 `anon` / `authenticated` 只读、`authenticated` 写入；所有 `INSERT` / `UPDATE` / `DELETE` 策略均以 `(select auth.uid()) = owner_id` 限制，更新同时具有 `USING` 与 `WITH CHECK`。`/creators/:id` 与 `/en/creators/:id` 只并行读取该公开资料与同一作者的 `published` 作品；迁移 `20260814121650_gallery_creator_published_posts_index.sql` 为该明确分页查询增加局部顺序索引。待审、驳回和下架快照不会经过该路径，资料不存在或被作者关闭时只显示不可用状态。私有云端 `albums` 已于后续 R7 P3 切片交付；公开分享与作者社交关系仍不在此路径内。

---

# 7. Glyph 字形资产体系

> **PRD.md §9.5 引用本章（`TECH.md §7`）。章节号不得变更。**

## 7.1 资产定位

字形是方寸最重要的数据资产。每个字形应作为**独立矢量对象**管理，而不是仅以某个 TTF/OTF 的 glyph index 存在。字体可以用于**初始化数据**，但上线资产需要独立版本、来源和授权信息。

## 7.2 字段定义

| 字段 | 用途 |
|---|---|
| `character` / `unicode` | 检索与字符映射 |
| `script` | `xiaozhuan` / `han_seal` / `guxi` / `bird_worm` / `jinwen` / `jiaguwen` … |
| `svg_path` | 标准化 Path，统一 viewBox |
| `bbox` / `width` / `height` | 布局尺寸 |
| `visual_center` | **视觉重心**，而非几何中心 |
| `ink_density` | 占墨面积比例 |
| `complexity` | 路径点数 / 结构复杂度 |
| `edge_affinity` | 是否适合借边 / 顶边 |
| `stretch_limits` | 允许横纵缩放范围 |
| `source` / `license` | 文献、印谱、字体或自绘来源 |
| `era` / `tags` | 历史风格与检索 |

## 7.3 补充字段（V2.0 新增）

| 字段 | 类型 | 用途 |
|---|---|---|
| `stroke_count` | int | 笔画数，用于复杂度与检索 |
| `is_modern_sealized` | bool | **是否为系统按篆书规则生成的现代篆化字形**（对应 DESIGN.md 20.4，界面需标注） |
| `confidence` | enum `attested` / `inferred` / `generated` | 有出土或文献实证 / 由规则推演 / 系统生成 |
| `radical` | text | 部首，用于字典检索 |
| `pinyin` | text[] | 拼音，用于字典检索 |
| `evolution_group` | uuid | 字源演变组，把同一字的甲骨→金文→小篆串起来（对应 DESIGN.md 13.5） |
| `note_zh` / `note_en` | text | 形体说明一句话，供字形选择器与字典直接使用 |
| `term_slugs` | text[] | 关联术语（如"鸟虫篆"），供知识浮层使用 |

`confidence` 是文化可信度的技术抓手：界面必须能区分"这是出土文物上的写法"与"这是我们生成的"。

## 7.4 标准化流程

1. **统一坐标系**，例如 `0..1000 × 0..1000`；
2. **路径方向、闭合规则和 winding 统一**，便于朱白布尔运算；
3. 导入时进行 **simplify**，但保留足够形态；**记录原始资产 hash**；
4. 计算 **bbox、visual center、density** 等派生特征并缓存；
5. 对每个 Variant 进行**人工审校**，标记"适合姓名印 / 满白 / 古玺不规则"等标签。

### 7.4.1 标准化流水线（V2.0 细化）

```
原始资产（TTF glyph / 扫描矢量化 / 自绘 SVG）
   ↓ 1. 提取路径
   ↓ 2. 归一化到 1000×1000，保持长宽比，按视觉重心居中
   ↓ 3. 统一 winding（外轮廓 CW，内轮廓 CCW），闭合所有子路径
   ↓ 4. simplify（Douglas-Peucker，容差 0.5 unit），点数上限 800
   ↓ 5. 计算派生特征：bbox / visual_center / ink_density / complexity / stroke_count
   ↓ 6. 自动质检（见 7.5）
   ↓ 7. 人工审校 + 打标签 + 填写 source / license / confidence
   ↓ 8. 写入 glyph_variants，生成 asset_hash，上传对象存储
```

**visual_center 的计算**：不是 bbox 中心，而是**墨面质心**：

```
visual_center = Σ(area_i · centroid_i) / Σ(area_i)
```

其中 `area_i` 为各闭合子路径的有向面积（内轮廓为负）。这保证"重心偏下的字"在布局时不会显得头重脚轻。

## 7.5 自动质检规则

导入流水线必须拦截以下问题（对应 27.7 Data QA）：

| 检查 | 阈值 / 规则 |
|---|---|
| 路径合法 | 无 NaN、无致命自交、所有子路径闭合 |
| 点数 | ≤ 800（超出需二次 simplify 或标记为高复杂度） |
| 墨面占比 | `0.05 ≤ ink_density ≤ 0.85`（超出通常是提取错误） |
| bbox 溢出 | 必须落在 `0..1000` 内，容差 2 unit |
| winding | 内外轮廓方向正确，否则布尔运算会挖反 |
| Unicode 一致 | `character` 与 `unicode` 互相对应 |
| 重复 | 同 `(glyph_id, source_id, asset_hash)` 视为重复，拒绝入库 |
| 来源缺失 | `source_id` 为空则拒绝上线（可入库为 draft） |

## 7.6 资产版本与缓存

| 概念 | 说明 |
|---|---|
| `asset_hash` | 单个 Variant 的内容哈希，作为 CDN 路径的一部分：`/glyphs/{hash}.svg`，可永久缓存 |
| `asset_version` | 整个字形库的版本号（如 `2026.08.1`），项目版本记录它 |
| 变更规则 | **已上线的 Variant 内容不可原地修改**；修正必须发布新 Variant 并把旧的标记为 `deprecated` |
| 老项目 | 引用 `variantId`，即使该 Variant 被 deprecate 仍可读取，保证"老项目不变样" |

## 7.7 缺字策略

用户输入的字符可能在目标 script 中没有资产。降级顺序：

```
1. 目标 script 的 Variant            → 直接使用
2. 同期近亲 script（小篆 ↔ 汉印篆）   → 使用并标记 script_fallback
3. 其他 script                       → 使用并提示用户
4. 规则篆化（modern sealization）    → 生成，标记 is_modern_sealized = true
5. 无法处理                          → 返回 MISSING_GLYPH，由 UI 提供换字选项
```

**接口契约**：`loadGlyphs()` 永不抛异常中断整批，而是对每个字符返回 `{ ok, variant, fallbackLevel, reason }`，让引擎能继续排版、让 UI 精确标注哪个字有问题（对应 DESIGN.md 20.4）。

---

# 8. Seal DSL 设计

## 8.1 定位

Seal DSL 是产品的"**单一事实来源**"。UI 控件、AI、项目保存、API、测试用例都只是在**读写同一个结构**。

V1 建议使用**版本化 JSON**，而非自创解析器；对外 API 可以再提供简化语法。

## 8.2 示例

```json
{
  "version": "1.0",
  "text": "清风明月",
  "shape": { "type": "square", "ratio": 1.0 },
  "mode": "yin",
  "style": "han_private",
  "script": "han_seal",
  "layout": {
    "strategy": "grid_2x2",
    "density": 0.76,
    "readingOrder": "traditional"
  },
  "glyphs": [
    {
      "char": "清",
      "variantId": "…",
      "scaleX": 1.02,
      "scaleY": 0.98,
      "dx": 0,
      "dy": 0,
      "locked": false
    }
  ],
  "border": { "type": "single", "width": 0.045, "distress": 0.18 },
  "impression": {
    "distress": 0.24,
    "inkUneven": 0.12,
    "bleed": 0.04,
    "seed": 834921
  }
}
```

## 8.3 设计要求

| 要求 | 说明 |
|---|---|
| **版本化** | `version` 必须存在；迁移函数将旧版本升级到当前版本 |
| **归一化数值** | 优先 0–1 相对参数，避免与画布像素绑定 |
| **引用资产** | 字形引用 `variantId` + asset version，不把大 path 直接塞入项目记录 |
| **可锁定** | 用户手工确定的字形 / 位置可 `locked`，自动重排时不得覆盖 |
| **随机可复现** | 所有随机算法由 `seed` 派生子 seed |
| **允许扩展** | unknown field 可忽略或保留，便于渐进升级 |

## 8.4 V2.0 新增字段

新增字段全部**可选且有默认值**，老 DSL 无需迁移即可被新引擎读取。

```json
{
  "grid":        { "type": "none|jie|tian|ri", "width": 0.02 },
  "inscription": {
    "enabled": false,
    "side": "left",
    "text": "",
    "script": "kai",
    "knife": "single",
    "faces": []
  },
  "physical":    { "sizeMm": 25, "material": "qingtian" },
  "paste":       { "color": "vermilion", "opacity": 1.0 },
  "paper":       { "color": "xuan", "texture": 0.03 },
  "meta":        { "sourceSealId": null, "remixOf": null, "exerciseId": null }
}
```

| 字段 | 说明 |
|---|---|
| `grid` | **界格**——是印章的一部分，会进入几何与导出（区别于屏幕参考线，见 DESIGN.md 10.4） |
| `inscription` | 边款（见 §22.1）；`faces[]` 为多面权威数据，`side` / `text` 镜像首面以兼容旧项目 |
| `physical.sizeMm` | 真实尺寸，用于刻制辅助与 1:1 导出；**不影响归一化几何** |
| `paste` / `paper` | 印泥与纸张，只影响渲染层，不影响几何 |
| `meta.sourceSealId` | 从历史印"以此风格生成"时记录来源，用于界面署名（"受广陵王玺启发"） |
| `meta.remixOf` | 从公开 Gallery Remix 时固定为 `gallery:<post-id>`；新项目保留来源，不复用源作品 Glyph |
| `meta.exerciseId` | 从学院课后练习进入时记录，用于提交练习（见 DESIGN.md 5.5） |

## 8.5 字段分层：几何 vs 表现

DSL 字段严格分为四层，这决定了改哪个字段需要重跑管线的哪一段：

| 层 | 字段 | 改动影响 |
|---|---|---|
| **几何层** | `text` `shape` `mode` `style` `script` `layout` `glyphs` `border` `grid` | 重跑布局 / 变换 / 合成 |
| **印蜕层** | `impression.*` | 只重跑 Distress，几何缓存复用 |
| **表现层** | `paste` `paper` | 只改渲染属性，不动任何路径 |
| **元数据层** | `physical` `meta` | 不影响渲染（`physical` 仅影响导出尺寸标注） |

**性能意义**：拖动"印泥"滑块只需重算表现层（近乎零成本）；拖动"残损"只重算印蜕层（可 debounce 50–100ms）；改文字才需要全管线。这直接支撑 DESIGN.md D-301 的 100ms 反馈要求。

## 8.6 归一化与迁移

```
normalize(dsl):
  1. 校验 version，未知版本拒绝
  2. 按 version 链式执行 migrate: 0.9 → 1.0 → 1.1 …
  3. 应用 style_profile 默认值填补缺失字段
  4. clamp 所有数值到合法区间（见附录 D）
  5. 校验 text 长度与字符合法性
  6. 若 seed 缺失，由 text + 当前时间生成一次并写回（此后固定）
  7. 返回 NormalizedDSL（所有字段必填，可直接进入引擎）
```

**迁移函数是纯函数且必须可测**：每个迁移都要有 golden case——旧 DSL 输入、新 DSL 输出、以及"迁移后重建的几何与迁移前一致"的断言。

## 8.7 DSL 校验错误契约

校验失败返回结构化错误，而非抛字符串（错误码全表见附录 E）：

```json
{
  "ok": false,
  "errors": [
    {
      "code": "TEXT_TOO_LONG",
      "path": "text",
      "message": "印章文字建议不超过 8 字",
      "severity": "warning",
      "suggestion": { "action": "truncate", "value": "清风明月长乐未" }
    }
  ]
}
```

`severity` 分 `error`（阻断）/ `warning`（提示但继续）/ `info`（仅记录）。**缺字是 warning，合规违规是 error**——这在技术层面保证了 DESIGN.md 20.4「缺字不阻断」与 20.5「合规阻断」的差异。

---

# 9. Seal Engine 总体管线

## 9.1 管线概览

```
Normalize DSL → Load Glyphs → Generate Layouts → Score/Resolve
   → Transform Paths → Compose Yin/Yang → Border → Distress → SVG Output
```

## 9.2 各阶段职责

| 阶段 | 职责 |
|---|---|
| **Normalize** | 补齐 style 默认值、验证文字 / 字数、迁移 DSL |
| **Load Glyphs** | 为每个字符加载指定 Variant 或候选 Variant |
| **Generate Layouts** | 根据字数、印式和风格生成若干布局 |
| **Score / Resolve** | 评分并选择 Top N，处理锁定、借边和安全边距 |
| **Transform** | 将字形放入目标 cell，应用横纵缩放、偏移、旋转和轻度风格变形 |
| **Compose** | 生成朱文 / 白文的前景与负形；必要时进行布尔运算 |
| **Border** | 生成边框，结合风格确定粗细、圆角 / 不规则度 |
| **Distress** | 基于 seed 生成多尺度缺损 mask |
| **Output** | 输出结构化 SVG，同时可生成印蜕预览层 |

## 9.3 阶段接口契约（V2.0 细化）

每个阶段是**纯函数**，输入输出明确，便于单测与缓存：

```
normalize(dsl)                        → NormalizedDSL | ValidationError
loadGlyphs(n, catalog)                → GlyphSet[]
generateLayouts(n, sets)              → LayoutCandidate[]
scoreLayouts(cands, n, profile)       → ScoredLayout[]
transformGlyphs(layout, sets)         → PlacedPath[]
compose(paths, n)                     → ComposedShape      // 朱白 + 界格
applyBorder(shape, n)                 → BorderedShape
applyDistress(shape, seed, n)         → ImpressionShape
serialize(shape, opts)                → SvgDocument
explain(n, layout, sets)              → ExplainFacts       // V2.0 新增
```

## 9.4 explain 输出（V2.0 新增）

管线额外输出一个**结构化事实对象**，供知识层使用（对应 DESIGN.md 10.5"说明"面板、15.2 知识卡、21.2.1 alt 文本）：

```json
{
  "charCount": 4,
  "mode": "yin",
  "modeTermSlug": "baiwen",
  "style": "han_private",
  "styleTermSlug": "han-seal",
  "layoutStrategy": "grid_2x2",
  "layoutTermSlug": "zhangfa",
  "densityBand": "full",
  "densityTermSlug": "manbai",
  "readingOrder": ["右上", "右下", "左上", "左下"],
  "readingOrderTermSlug": "huiwen",
  "distressBand": "slight",
  "borderType": "single",
  "glyphSources": [
    { "char": "清", "script": "han_seal", "confidence": "attested", "source": "汉印文字征" }
  ],
  "annotations": [
    { "kind": "border", "termSlug": "yinbian", "path": "M…" },
    { "kind": "grid",   "termSlug": "jiege",   "path": "M…" }
  ]
}
```

**关键点**：引擎输出的是**事实与术语 slug**，不是中文句子。中文句子由 Knowledge 层根据 locale 组装（见 §20.5）。这样英文界面、投屏模式、屏幕阅读器 alt 文本可以用同一份事实生成不同表述。

`annotations[]` 直接给出标注层需要的几何路径，使 DESIGN.md 15.3 的印面标注层不需要前端反推坐标。

## 9.5 缓存分层

按 8.5 的字段分层设计缓存：

| 缓存键 | 内容 | 失效条件 |
|---|---|---|
| `geo:{hash(几何层字段 + assetVersion + engineVersion)}` | `BorderedShape` | 几何层任一字段变化 |
| `imp:{geoKey}:{hash(impression)}` | `ImpressionShape` | 印蜕层变化 |
| `svg:{impKey}:{hash(renderOpts)}` | SVG 字符串 | 渲染选项变化 |
| `explain:{geoKey}` | `ExplainFacts` | 同几何层 |

客户端用 LRU（内存，上限 50 项）；服务端用 Redis 或边缘 KV，TTL 24h。

## 9.6 错误与降级

| 阶段失败 | 降级策略 |
|---|---|
| Load Glyphs 部分缺字 | 按 7.7 降级，继续管线，`warnings[]` 记录 |
| Layout 无可行解 | 回退到"居中等分"兜底模板，标记 `fallbackLayout: true` |
| 布尔运算失败（白文） | 回退到"描边模拟"渲染，标记 `booleanFallback: true`，导出时提示 |
| Distress 超时 | 降低采样精度重试一次，仍失败则输出无残损版本 |
| 序列化路径过大 | 自动 simplify 到复杂度预算内，记录 `simplified: true` |

**原则**：引擎宁可输出一枚"降级但正确"的印章，也不返回错误页。所有降级都必须在返回值里显式标记，供 UI 与监控使用。

---

# 10. 章法 Layout Engine

## 10.1 设计立场

> MVP 不需要从零"发明章法"。应先建立**高质量模板 + 评分体系**，再逐步增加约束优化。模板解决历史可信和可控性，评分解决同一模板在不同字形下的适配。

## 10.2 候选模板

| 字数 | 候选 |
|---|---|
| **1** | 居中 / 偏心古玺 |
| **2** | 右左纵排 / 横排 / 大小错落 |
| **3** | 右二左一 / 右一左二 / 三纵列 |
| **4** | 2×2 田字 / 回文 / 两列纵排 / 不等格古玺 |
| **5–8（后期）** | 2–3 列动态列宽 / 混合 cell |

### 10.2.1 模板数据结构（V2.0 细化）

模板是**数据**不是代码，存于 `layout_templates` 或随 Style Profile 分发：

```json
{
  "id": "grid_2x2",
  "charCount": 4,
  "shapes": ["square", "rect"],
  "cells": [
    { "x": 0.5, "y": 0.5, "w": 0.5, "h": 0.5, "order": 1 },
    { "x": 0.5, "y": 0.0, "w": 0.5, "h": 0.5, "order": 2 },
    { "x": 0.0, "y": 0.5, "w": 0.5, "h": 0.5, "order": 3 },
    { "x": 0.0, "y": 0.0, "w": 0.5, "h": 0.5, "order": 4 }
  ],
  "readingOrder": "huiwen",
  "flexible": { "cellWidth": 0.15, "cellHeight": 0.10, "gutter": 0.06 },
  "styleAffinity": { "han_private": 1.0, "qin_formal": 0.7, "guxi": 0.3 },
  "termSlug": "huiwen"
}
```

| 字段 | 说明 |
|---|---|
| `cells` | 归一化到 `0..1` 的内框坐标，`order` 为阅读顺序 |
| `readingOrder` | 阅读顺序类型（`huiwen` 回文 / `traditional` 右起纵读 / `modern`） |
| `flexible` | 各维度允许微调的幅度，供局部优化使用 |
| `styleAffinity` | 与各 Style Profile 的匹配度，进入评分的 `historicalStyle` 项 |
| `termSlug` | 关联术语，使布局本身可被解释（"这是回文序"） |

**阅读顺序必须来自模板而非推断**：汉印四字回文序（右上→右下→左上→左下）与现代阅读顺序不同，这是 DESIGN.md 12.4.1 阅读顺序动画的数据来源，也是最容易出错的文化细节。

## 10.3 评分函数

推荐采用**加权评分**，权重可由 Style Profile 覆盖：

```
score = w1·balance + w2·density + w3·whitespace + w4·glyphFit
      + w5·borderRelation + w6·historicalStyle − penalties
```

| 项 | 计算思路 |
|---|---|
| **Balance** | 合成墨面视觉重心与印面中心距离 |
| **Density** | 目标占墨率与实际占墨率差值 |
| **Whitespace** | 主要负空间是否过碎 / 过空；可用分区采样近似 |
| **Glyph Fit** | 每字缩放是否超出建议范围，复杂字是否被过度压缩 |
| **Border Relation** | 是否符合借边 / 顶边偏好，是否产生不自然粘边 |
| **Historical Style** | 模板与 style profile 的匹配加分 |
| **Penalty** | 重叠、越界、过小字、极端 aspect ratio、锁定冲突 |

### 10.3.1 各项的具体算法（V2.0 细化）

**Balance**（0–1，越高越好）

```
center = Σ(area_i · visualCenter_i) / Σ(area_i)      // 所有已放置字形的合成重心
d = |center − canvasCenter| / (canvasSize / 2)
balance = 1 − clamp(d, 0, 1)
```

**Density**

```
actual = inkArea / innerArea                          // 内框内墨面占比
target = profile.targetDensityRange                   // 如 [0.62, 0.80]
density = 1 − normalizedDistanceToRange(actual, target)
```

白文的 `inkArea` 是**底面积**而非笔画面积——满白印的密度指的是红底占比，这一点算反会导致汉印全部评分偏低。

**Whitespace**（负空间质量）

```
把内框划为 16×16 网格，标记每格是否为空白
求空白连通域 → { count, maxArea, areaVariance }
whitespace = f(maxArea 适中, count 不过多, variance 不过大)
```

直觉：好的章法有**少数几块像样的留白**，而不是满盘碎白点。

**Glyph Fit**

```
for each glyph:
  sx, sy = 实际缩放
  penalty_i = outOfRange(sx, variant.stretchLimits.x)
            + outOfRange(sy, variant.stretchLimits.y)
            + complexityPenalty(variant.complexity, cellArea)
glyphFit = 1 − mean(penalty_i)
```

`complexityPenalty` 保证"高复杂度的字不被塞进小格子"——这是可读性的主要保障。

**Border Relation**

```
for each glyph:
  gap = 字形到边框内缘的最小距离
  若 profile.edgeAffinity 偏好借边 且 gap ∈ [0, 0.01]  → 加分
  若 gap ∈ (0, 0.005) 且不偏好借边                    → 扣分（"若即若离"最难看）
  若 gap < 0                                          → 越界，进 penalty
```

**Penalties（硬约束，命中即大幅扣分或淘汰）**

| 惩罚 | 条件 | 权重 |
|---|---|---|
| 越界 | 字形超出安全区且未开启借边 | 淘汰 |
| 重叠 | 两字包围盒交集面积 > 5% | 淘汰 |
| 锁定冲突 | 方案改变了 `locked: true` 的字形或位置 | 淘汰 |
| 过小字 | 某字缩放后面积 < 平均的 40% 且非风格意图 | −0.3 |
| 极端比例 | `sx/sy` 超出 `[0.6, 1.6]` | −0.2 |
| 密度反常 | 白文密度 < 0.35 或 > 0.95 | −0.2 |

## 10.4 自动微调

> 对于 Top K 候选，可做**有限次数的局部搜索**：微调 cell 宽高、字间距、整体平移和单字尺度，以最大化评分。MVP 可以使用**离散网格 / 随机爬山**，避免过早引入复杂连续优化器。

### 10.4.1 局部搜索参数（V2.0 细化）

| 参数 | MVP 取值 |
|---|---|
| Top K | 6 |
| 迭代上限 | 每候选 24 次 |
| 时间预算 | 全部候选合计 ≤ 300ms（客户端） |
| 扰动维度 | cellWidth ±0.15、cellHeight ±0.10、gutter ±0.06、globalScale ±0.08、单字 dx/dy ±0.02 |
| 步长 | 离散 3 档（−1, 0, +1）× 幅度 |
| 接受条件 | 严格提升才接受（爬山，不做模拟退火） |
| 随机来源 | `deriveSeed(rootSeed, 'layout', templateId)`——**保证复现** |
| 锁定处理 | `locked` 的字形不参与任何扰动 |

**超时行为**：达到时间预算立即返回当前最优，不抛错。局部搜索是**优化**不是**必需**，未优化的模板结果本身就是可用的。

## 10.5 候选多样化

生成 6–12 个候选时，必须避免"同一模板的微小差异"占满结果区（对应附录 C「候选多样性」验收项）：

```
diversify(candidates, n=12):
  1. 按 score 降序
  2. 定义特征向量 v = [templateId, mode, densityBand, borderType, dominantScript]
  3. 贪心选择：新候选与已选集合的最小汉明距离 ≥ 2 才入选
  4. 若不足 n 个，放宽到距离 ≥ 1
  5. 仍不足则允许同模板但要求 score 差异 > 0.05
```

**产品意义**：用户点"换一批"时看到的应该是**真的不一样**的方案，而不是同一个印章缩放 2%。

## 10.6 锁定与重排的语义

对应 DESIGN.md 10.3.2 的锁定机制，引擎层的精确定义：

| 操作 | 行为 |
|---|---|
| **重排章法**（`relayout`） | 重新生成布局，但 `glyphs[i].locked === true` 的字保持 `variantId` 不变；若同时锁定位置（`positionLocked`），则 `dx/dy/scaleX/scaleY` 也不变，其余字围绕它重排 |
| **重新设计**（`redesign`） | 允许替换未锁定字的 `variantId` |
| **重新盖印**（`reimpress`） | 只改 `impression.seed`，几何完全不变 |

三者对应三个不同的 API 语义，**不能合并成一个"重新生成"**——这是专业用户信任产品的关键。

---

# 11. 字形变形 Glyph Transform

## 11.1 能力矩阵

| 能力 | MVP | 后期 |
|---|---|---|
| **Scale X/Y** | 是；限制在 Variant 推荐范围 | 非线性局部拉伸 |
| **Translate** | 是 | 基于笔画区域吸附 |
| **Rotate** | 小角度 | 局部部件旋转 |
| **Borrow Border** | 规则化：贴近 / 轻接边 | 自动路径融合 |
| **Merge Strokes** | 否 / 少量预制 Variant | 骨架级拓扑变换 |
| **Bend / Curl** | 通过 Variant 表达 | 真正曲线变形场 |
| **Fill Corner** | 规则提示 + Variant | 生成式拓扑重构 |

## 11.2 核心决策

> 首版应优先"**多 Variant + 几何变换**"，而不是试图对任意字形做**智能笔画拓扑变形**。后者研发成本高、**文化风险也更大**。

"文化风险"的含义：自动改动笔画结构可能产生**不存在的字**或**错字**。一个把"日"改成"曰"的算法在技术上只是多拉了一根线，在文化上是硬伤。因此 MVP 的边界是：**只做仿射变换，不动拓扑**。

## 11.3 变换顺序（V2.0 明确）

变换必须按固定顺序应用，否则结果不可复现：

```
1. 以 visual_center 为原点平移到 cell 中心
2. 非等比缩放 scaleX / scaleY（受 stretch_limits 约束）
3. 旋转 rotate（小角度，绕 cell 中心）
4. 偏移 dx / dy（用户微调）
5. 借边调整（若 edge_affinity 且风格允许）
```

矩阵形式：`M = T(dx,dy) · R(θ) · S(sx,sy) · T(−vc)`

**为什么以视觉重心而非 bbox 中心**：篆书字形上下密度常不均（如"月"下部笔画密），按 bbox 居中会显得下沉。

## 11.4 stretch_limits 的约束与惩罚

```
clampScale(requested, limits):
  hard = limits.hard      // 如 [0.85, 1.20]，超出即视觉失真
  soft = limits.soft      // 如 [0.93, 1.10]，超出但可接受
  if requested ∈ soft  → 无惩罚
  if requested ∈ hard  → 线性惩罚
  else                 → clamp 到 hard 边界，记录 warning
```

`stretch_limits` 由人工审校时按字形结构填写：横画多的字（如"三"）纵向压缩容忍度低，竖画多的字（如"川"）横向压缩容忍度低。

## 11.5 借边（Borrow Border）规则

借边是篆刻中重要的章法手段，MVP 用规则实现：

| 级别 | 条件 | 效果 |
|---|---|---|
| `none` | 默认 | 字形与边框保持 `≥ 0.015` 归一化间距 |
| `touch` | `edge_affinity ≥ 0.6` 且 profile 允许 | 字形外缘与边框内缘距离设为 0，视觉相接 |
| `merge` | 后期 | 路径布尔并集，真正融为一体 |

MVP 只做 `touch`：把字形沿最近边方向平移到刚好接触。`merge` 需要可靠的路径布尔与形态学处理，风险高，延后。

## 11.6 确定性要求

所有变换的浮点计算必须：

- 使用固定的舍入策略（保留 4 位小数后再序列化）；
- 不依赖 `Array.sort` 的不稳定性（必须提供全序比较器，含 tie-breaker）；
- 不使用 `Set`/`Map` 迭代顺序做几何决策；
- 跨端（Node / 浏览器）产生逐位一致的路径字符串。

这三条是 `rebuild_consistency` 接近 100% 的前提。

---

# 12. 印式与边框 Border Engine

## 12.1 核心定义

> 印式由 **normalized shape path** 定义，边框是沿 shape 的 **inward stroke / offset path**，而不是一个 UI CSS border。这样才能参与残损、白文布尔和导出。

## 12.2 边框类型与算法

| 边框类型 | 算法 |
|---|---|
| `single` | shape inset 后形成环形 path |
| `thick` | 增加环宽；与白文密度联动 |
| `double` | 两层 offset ring |
| `irregular` | 基础边界 + 低频 noise 位移 |
| `broken` | 边框 path 与 macro distress mask 相交 |

## 12.3 印式定义（V2.0 细化）

| `shape.type` | 路径生成 | 参数 |
|---|---|---|
| `square` | 直接矩形，`ratio` 控制长宽比 | `ratio`（1.0 = 正方） |
| `rect` | 同上，`ratio ≠ 1` | `ratio`（如 0.6 = 竖长方） |
| `circle` | 圆 | — |
| `ellipse` | 椭圆 | `ratio` |
| `freeform`（后期） | 随形，由控制点定义 | `points[]` |

所有 shape 都归一化到 `1000×1000` 画布，非方形按长边贴合、短边居中。

## 12.4 界格（V2.0 新增）

界格是印面内的分隔线，属于**几何层**，会进入导出：

| `grid.type` | 说明 |
|---|---|
| `none` | 无界格（默认） |
| `jie` | 界格——按布局 cell 边界生成分隔线 |
| `tian` | 田字格——十字分隔 |
| `ri` | 日字格——单横或单竖分隔 |

界格路径与边框同层处理：朱文时界格为实线笔画，白文时界格是"留红"（不挖空的部分）。**界格与屏幕参考线在数据上完全不同**（后者不在 DSL 中），对应 DESIGN.md 10.4 的强调。

## 12.5 朱白与边框的耦合

| 模式 | 边框语义 |
|---|---|
| 朱文（`yang`） | 边框是**实体笔画**，与字形同为前景，一起被残损侵蚀 |
| 白文（`yin`） | 边框是**留红区域**的外边界；字形从红底中挖出。边框加粗 = 红底外圈加宽 |

白文的合成顺序：

```
1. 生成 shape 内部实心区域（红底）
2. 减去边框外侧（inset 部分保留为红）
3. 减去所有字形路径（挖出白字）
4. 减去界格路径（若为白文界格）
5. 应用残损 mask
```

**布尔运算失败的兜底**（对应 9.6）：若第 3 步布尔失败，改用 `fill-rule="evenodd"` 的复合路径模拟，视觉近似但导出到部分软件可能有差异，需标记 `booleanFallback`。

## 12.6 边框参数区间

| 参数 | 范围 | 默认 | 说明 |
|---|---|---|---|
| `border.width` | 0.015–0.12 | 0.045 | 归一化，占画布边长比例 |
| `border.distress` | 0–1 | 0.18 | 边框独立的残损强度 |
| `border.irregularity` | 0–1 | 由 profile 决定 | 低频扰动幅度 |
| `border.corner` | 0–0.06 | 0 | 圆角半径；**古玺可为 0（尖角），官印略大** |

---

# 13. 印蜕与残损 Distress Engine

## 13.1 设计立场

> 残损应**分尺度生成**并保留可复现 seed。避免只叠一张噪点 PNG，因为那会产生重复、分辨率限制和"贴纹理"感。

## 13.2 三个尺度

| 尺度 | 模拟对象 | 建议方法 |
|---|---|---|
| **Macro** | 边框崩口、大块缺损 | 随机 blobs / Voronoi cell + shape edge bias |
| **Meso** | 笔画断裂、飞白 | 多尺度 noise threshold + path intersection |
| **Micro** | 印泥颗粒、纸纤维 | 高频噪声，仅预览 / 位图导出时增强 |

### 13.2.1 Macro 细节（V2.0）

```
edgeBiasedBlobs(seed, intensity):
  n = round(2 + intensity · 10)                    // 崩口数量
  for i in 0..n:
    t = rand(seed, i)                              // 沿边框周长的位置参数
    p = pointOnBorderPath(t)
    r = (0.01 + intensity · 0.05) · rand()         // 半径
    shape = irregularBlob(p, r, seed_i)            // 3–7 边的不规则多边形，顶点带扰动
    blobs.push(shape)
  return union(blobs)
```

**edge bias 的含义**：真实印章的大缺损集中在**边框和角**（磕碰所致），不会在印面正中间无故缺一块。生成时对边缘 30% 区域的概率加权 3 倍，角部再加权 1.5 倍。

### 13.2.2 Meso 细节

```
multiScaleNoise(seed, intensity):
  f = valueNoise(seed, freq=8)  · 0.5
    + valueNoise(seed, freq=20) · 0.3
    + valueNoise(seed, freq=48) · 0.2
  threshold = 1 − intensity·0.55
  mask = { p | f(p) > threshold }
  // 只作用于笔画区域，且沿笔画方向拉长（飞白是顺着刀势的）
  return intersect(mask, strokeRegion) ⊗ directionalStretch
```

飞白的**方向性**是真实感的关键：随机圆点像被虫蛀，沿笔画方向拉长的缺口才像刀刻。

### 13.2.3 Micro

Micro 尺度**不进入矢量路径**（会让 SVG 爆炸）。它只在：

- 预览层作为半透明位图叠加；
- PNG 导出时以更高强度渲染；
- SVG 导出时**完全省略**（或作为可选的 `<filter>`，默认关闭）。

## 13.3 Seed 体系

> `rootSeed → borderSeed / glyphSeed[i] / inkSeed / paperSeed`。每个子模块用**稳定哈希派生**，保证只修改"印泥"时不会意外改变字形缺损。

### 13.3.1 派生规则（V2.0 明确）

```
deriveSeed(rootSeed, channel, index = 0):
  return fnv1a(`${rootSeed}:${channel}:${index}`) >>> 0

channels: 'border' | 'glyph' | 'ink' | 'paper' | 'layout' | 'macro' | 'meso' | 'micro'
```

| 要求 | 说明 |
|---|---|
| 稳定 | 同输入必得同输出，跨端跨版本一致 |
| 独立 | 改 `inkSeed` 相关参数不影响 `glyphSeed` 结果 |
| 与索引绑定 | `glyphSeed[2]` 只影响第 3 个字，增删字不影响其他字的残损形态 |
| 可手输 | UI 暴露 `rootSeed` 输入框，用户可复制粘贴复现他人结果 |

**反例警示**：若用"全局计数器"或"数组顺序"派生 seed，用户删掉第一个字会导致后面所有字的残损全变——这是最常见的确定性 bug。

## 13.4 强度映射

> UI 的"残损 0–100"**不应线性映射**单个 threshold。建议分段：
> - **0–20**：仅微颗粒；
> - **20–50**：增加笔画 / 边框小缺口；
> - **50–80**：出现明显飞白和崩边；
> - **80+**：为实验性重残。

### 13.4.1 映射表（V2.0 细化）

| UI 值 | 语义（DESIGN.md 9.3.3） | macro | meso | micro |
|---|---|---|---|---|
| 0–10 | 全新 | 0 | 0 | 0.1 |
| 11–35 | 微残 | 0.10 | 0.15 | 0.3 |
| 36–65 | 斑驳 | 0.35 | 0.45 | 0.5 |
| 66–100 | 出土 | 0.70 | 0.75 | 0.8 |

段内线性插值，段间平滑过渡（避免滑块跨档时视觉跳变）。

**保护规则**：无论强度多高，残损后**每个字仍需保持可辨识**。引擎在应用 mask 后校验各字形剩余墨面 ≥ 原面积的 45%，不足则局部回退该字的 mask 强度。这防止"出土档"把印章变成一团红斑。

## 13.5 性能预算

| 场景 | 精度 | 预算 |
|---|---|---|
| 拖动滑块（预览） | 网格 128×128，仅 macro + 简化 meso | ≤ 30ms |
| 松手后（精细预览） | 网格 256×256，全尺度 | ≤ 150ms |
| SVG 导出 | 网格 512×512，矢量化 mask | ≤ 2s |
| PNG 高清导出 | 位图直接运算，无需矢量化 | 任务化 |

拖动时使用 debounce 50–100ms + 低精度近似 mask（对应 DESIGN.md 19.1）。

---

# 14. 印泥与纸张渲染

## 14.1 效果分层

| 效果 | 矢量层 | 位图预览层 |
|---|---|---|
| **印泥不均** | mask 中低频透明度块 | 可叠加微颗粒 |
| **边缘扩散** | 轻微 morphology / offset | 高分辨率 blur + threshold 回收边界 |
| **纸张吸墨** | 几何边缘轻扰动 | 结合纸纹法线 / 灰度 |
| **重影** | 复制整体 path 轻微位移并降低不透明度 | 同 |
| **颜色** | 朱砂 / 朱磦 / 暗朱 token | 可加轻微局部饱和度差 |

## 14.2 导出策略

> **SVG 导出默认保留干净可编辑版本或矢量残损；纸张纹理不应强制嵌入 SVG。PNG 印蜕导出可以使用更丰富的位图模拟。**

| 导出目标 | 印泥 | 纸张 | 微颗粒 |
|---|---|---|---|
| Editable SVG | 纯色填充 | 无 | 无 |
| Flattened SVG | 纯色 + 可选透明度 mask | 无 | 无 |
| Transparent PNG | 完整模拟 | 无（透明） | 有 |
| Paper PNG | 完整模拟 | 有 | 有 |
| 刻制辅助稿 | **纯黑**（非朱砂） | 无 | 无 |

**刻制辅助稿必须是纯黑白**：用于上石描摹时，印泥色和残损都是干扰。这是 DESIGN.md 10.8 的技术要求。

## 14.3 印泥色板（与 DESIGN.md 6.1.4 对齐）

| `paste.color` | HEX | 说明 |
|---|---|---|
| `vermilion` | `#C8402C` | 朱砂印泥（默认） |
| `cinnabar_deep` | `#A8321F` | 陈年印泥 |
| `vermilion_light` | `#D9573F` | 光明砂，偏橙 |
| `black` | `#1F1D1B` | 黑印泥 |

印泥色是**渲染参数**不是 UI Token，两套色板不得混用。

## 14.4 边缘扩散算法

```
bleed(path, amount):
  // amount ∈ [0, 0.06]，归一化
  1. offset(path, +amount · 8)            // 向外扩张
  2. 沿轮廓采样，加入低频噪声位移（seed: paperSeed）
  3. 与原 path 做 union，保持内部实心
  4. simplify 到复杂度预算
```

真实钤印的边缘扩散是**不均匀**的——纸张纤维方向、用力轻重都会影响。纯 offset 得到的等距扩张看起来像"描粗了"，必须叠加噪声。

---

# 15. SVG 渲染与导出

## 15.1 输出格式与策略

| 输出 | 策略 |
|---|---|
| **Editable SVG** | 分组保留：`shape / border / glyphs / distress`；提供 metadata |
| **Flattened SVG** | 将布尔和 mask 尽可能展开，提升下游软件兼容性 |
| **Transparent PNG** | 高倍率栅格化，透明背景 |
| **Paper PNG** | 叠加纸色 / 纸纹和印泥扩散 |
| **PDF（后期）** | 矢量优先，真实尺寸 mm |
| **DXF / EPS（专业）** | 需要更严格的 path clean-up 与单位定义 |

## 15.2 通用要求

- 所有导出带明确 **viewBox 和真实尺寸元数据**；
- SVG 中**不依赖远程字体**；
- 对 path points 数量设**软限制**，必要时 simplify；
- 导出前运行 **sanitizer**，移除脚本、外链与不必要 metadata。

## 15.3 SVG 结构规范（V2.0 细化）

```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 1000 1000"
     width="25mm" height="25mm"
     role="img" aria-labelledby="t d">
  <title id="t">清风明月</title>
  <desc id="d">清风明月，汉印白文方印</desc>
  <metadata>
    <fangcun:seal xmlns:fangcun="https://fangcun.app/ns"
      version="1.0" engine="1.4.2" asset="2026.08.1" seed="834921"
      style="han_private" mode="yin" script="han_seal"
      sizeMm="25" license="personal"/>
  </metadata>
  <g id="seal">
    <g id="ground">…</g>     <!-- 白文红底 / 朱文为空 -->
    <g id="border">…</g>
    <g id="grid">…</g>       <!-- 界格，无则省略 -->
    <g id="glyphs">
      <path id="g0" data-char="清" data-variant="…"/>
      …
    </g>
    <g id="distress">…</g>
  </g>
</svg>
```

| 规则 | 说明 |
|---|---|
| `<title>` / `<desc>` | **必须存在**，`<desc>` 内容与 alt 文本一致（DESIGN.md 21.2.1） |
| `metadata` | 自定义命名空间记录重建所需全部信息，使一个 SVG 文件本身可追溯 |
| `data-char` | 每个字形路径标注其字符，便于下游识别与自动化 |
| 分组 id | 固定命名，供 Figma / Illustrator 用户按组操作 |
| 无 `<script>` | sanitizer 强制移除 |
| 无 `<image>` 外链 | 纹理不嵌入 SVG |

## 15.4 复杂度预算

| 场景 | path 点数上限 | 超出处理 |
|---|---|---|
| 交互预览 | 3,000 | 自动降低残损精度 |
| Editable SVG | 12,000 | 提示用户，允许继续 |
| Flattened SVG | 20,000 | 自动 simplify 并标记 |
| PNG | 不限（位图） | — |

超出 Editable SVG 预算时，返回结构化警告供 UI 展示（对应 DESIGN.md 18.3.4 的复杂度提示）：

```json
{
  "code": "SVG_COMPLEX",
  "severity": "warning",
  "estimatedBytes": 2451000,
  "pointCount": 14320,
  "suggestion": { "action": "reduce_distress", "to": 0.35 }
}
```

## 15.5 Sanitizer 规则

导出前对生成的 SVG 执行：

| 移除 | 原因 |
|---|---|
| `<script>`、`on*` 属性 | XSS |
| `<foreignObject>` | 可嵌 HTML，风险 |
| 外部 `href` / `xlink:href`（非 `#` 内部引用） | SSRF、隐私追踪 |
| `<image>` 外链 | 同上 |
| 注释、编辑器私有属性 | 体积与信息泄露 |
| `<!DOCTYPE>` 与实体声明 | XXE |

用户上传自定义 SVG（后期）时，**入站也必须 sanitize**（见 25.2）。

## 15.6 真实尺寸与 PDF

| 要求 | 说明 |
|---|---|
| SVG `width/height` | 用 mm 单位，`viewBox` 保持 1000 单位，浏览器按 96dpi 换算 |
| PNG DPI | 由 `sizeMm` 与目标像素反推并写入 PNG 元数据 |
| PDF | 页面尺寸为印章尺寸 + 边距，内容 1:1 |
| 刻制辅助稿 PDF | 含 10mm 校验标尺条 + 正反稿并排 + 页脚署名（DESIGN.md 7.5） |

**校验标尺**是必需的：打印机缩放设置错误会导致整张稿失真，用户必须能用尺子验证。

## 15.7 兼容性目标

| 目标软件 | 要求 |
|---|---|
| Chrome / Safari / Firefox | 渲染一致 |
| Figma | 导入后分组保留，路径可编辑 |
| Adobe Illustrator | 打开无警告，`fill-rule` 正确 |
| Inkscape | 同上 |
| 激光雕刻软件（后期 DXF） | 闭合路径、单位明确 |

Flattened SVG 存在的理由就是兼容性：部分下游软件对 `mask` / `clipPath` 支持不佳，展开成实心路径最保险。

---

# 16. AI 篆刻师技术架构

## 16.1 链路

```
Prompt → Intent Parser → Structured JSON → Constraint Validator
       → Style Resolver → Seal DSL → Seal Engine
```

## 16.2 分层职责

| 层 | 职责 |
|---|---|
| **Intent Parser** | 抽取文字、用途、时代 / 气质、形状、朱白、残损、输出用途 |
| **Validator** | 检查字数、缺字、不支持组合；返回明确修正 |
| **Style Resolver** | 将"孤寂古朴"等抽象词映射到 style tags 和参数区间 |
| **Explanation** | 生成 1–2 句推荐理由，但**不得声称不存在的历史事实** |
| **Seal Engine** | 最终几何和随机效果的唯一生产者 |

## 16.3 核心约束

> LLM 应输出**受 JSON Schema 约束**的中间对象。任何数值都需经过后端 **validator clamp** 到允许区间，**不能直接把模型值传入几何算法**。

## 16.4 Intent 中间结构（V2.0 细化）

LLM 输出的**不是 DSL**，而是一个更松的意图对象，由 Style Resolver 转成 DSL：

```json
{
  "text": "张三之印",
  "purpose": "calligraphy_signature",
  "eraHint": "han",
  "moodTags": ["formal", "restrained"],
  "shapeHint": "square",
  "modeHint": "yin",
  "distressHint": "slight",
  "sizeMmHint": 20,
  "outputUse": "print",
  "uncertain": ["eraHint"],
  "reasons": [
    { "field": "modeHint", "text": "姓名章传统用白文", "termSlugs": ["baiwen", "mingzhang"] }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `*Hint` | 全部是**建议**而非命令，Resolver 可覆盖 |
| `uncertain[]` | 模型自报不确定的字段，UI 据此标注"我猜是…"并提供修改入口 |
| `reasons[]` | 每条理由带 `termSlugs`，使理由中的术语可渲染为知识浮层（对应 DESIGN.md 11.3） |

**为什么理由要带 termSlugs 而不是让前端做文本匹配**：模型说"白文"时可能写成"阴文"，前端匹配不到；让模型直接输出 slug 消除歧义。

## 16.5 Validator 的 clamp 策略

```
resolve(intent, catalog, profiles):
  1. 文字校验：长度、字符合法、合规预检
  2. 缺字检查：loadGlyphs 试探，缺字则调整 script 或标记
  3. eraHint → style_profile 查表；未知则用默认 profile
  4. 所有 *Hint 映射为 DSL 字段，逐一 clamp 到 profile 的合法区间
  5. 若 hint 之间冲突（如 guxi + 圆形 + 满白），按优先级裁决并记录 conflict
  6. 生成 seed（若用户未指定）
  7. 输出 DSL + resolveLog
```

`resolveLog` 记录每一次 clamp 与冲突裁决，用于：UI 的"查看完整参数"、调试、以及 `ai_valid_dsl_rate` 指标归因。

## 16.6 降级链

| 失败 | 降级 |
|---|---|
| LLM 超时 / 不可用 | **规则推荐**：按关键词表匹配 style profile，输出保守参数 |
| Schema 校验失败 | 重试 1 次（带错误反馈）；再失败则降级到规则推荐 |
| 输出含未知字段 | 忽略未知字段，其余照用 |
| 理由中出现无法验证的史实 | Explanation 后置过滤器移除该句（见 16.7） |

**规则推荐兜底表**（MVP 约 40 条关键词）：

| 关键词 | → style | → mode |
|---|---|---|
| 落款、姓名章、书法 | `han_private` | `yin` |
| Logo、品牌、现代 | `literati_ming_qing` | `yang` |
| 古朴、高古、越古越好 | `guxi_warring_states` | `yin` |
| 官印、正式 | `official_song_yuan` | `yang` |
| 闲章、雅致、茶 | `literati_ming_qing` | `yin` |

## 16.7 Explanation 安全过滤

AI 生成的理由必须通过后置过滤，防止编造史实（对应 PRD 17.3 文化表述规范）：

| 规则 | 处理 |
|---|---|
| 出现具体年份 / 人名 / 出土地 | 移除该句（除非能在 `wiki_terms` / `historic_seals` 中校验到） |
| 出现"复刻""完全一样""正宗" | 替换为"接近…特征" |
| 出现在世艺术家姓名 | 移除 |
| 出现绝对化表述（"必须""唯一"） | 替换为"通常""多见于" |
| 长度超过 2 句 | 截断 |

过滤器是**白名单式**的：只允许陈述可从 Style Profile 与术语库校验的事实。

## 16.8 成本与缓存

| 措施 | 说明 |
|---|---|
| Prompt 缓存 | 系统提示词与 Schema 部分走 provider 的 prompt caching |
| 结果缓存 | 相同 prompt 文本（归一化后）24h 内复用 intent，**但重新生成 seed**，保证结果不完全雷同 |
| 流式 | Intent 解析流式返回，前端先展示"正在理解用途 / 风格 / 章法"三段进度（DESIGN.md 11.2） |
| 限流 | 未登录 5 次/日，Free 20 次/日，Pro 200 次/日 |

### 16.8.1 当前 provider 配置

M7 在线解析使用 OpenAI Responses API Structured Outputs。设置 `OPENAI_AI_DESIGNER_PROVIDER=openai`、服务端 `OPENAI_API_KEY` 后启用，默认模型为 `gpt-5.6-luna`，可用 `OPENAI_AI_DESIGNER_MODEL` 覆盖；`OPENAI_AI_DESIGNER_TIMEOUT_MS` 默认 6000ms。API key 不进入 `NEXT_PUBLIC_*`。

provider Schema 不包含印文和推荐理由：印文由本地规则先确定，理由只从已核验 Style Profile 生成。响应设置 `store: false`；模型拒绝、超时、网络错误或两次 Schema 校验失败时，立即使用规则推荐。瞬时错误不写入 24 小时 Intent 缓存，避免服务恢复后继续命中旧降级结果。

---

# 17. 历史风格 Style Profile

## 17.1 定位

> Style Profile 是**历史风格与现代算法之间的桥梁**。它不是"复制某一枚印"，而是一组**参数分布、模板偏好和约束**。

## 17.2 字段

示例字段：`preferredScripts`, `preferredShapes`, `modeWeights`, `layoutWeights`, `targetDensityRange`, `borderProfile`, `glyphStretchRange`, `irregularity`, `distressRange`, `readingOrder`, `tags`。

## 17.3 内置 Profile

| Profile | 示例特征 |
|---|---|
| `guxi_warring_states` | 不等格、较自由、边框不规则、字形大小差异大 |
| `qin_formal` | 较方整、格线 / 边界关系强、布局规整 |
| `han_private` | 2×2 / 两列、高密度、平正宽博、白文常见 |
| `literati_ming_qing` | 更强调个性、疏密变化和边框 / 刀感 |
| `official_song_yuan` | 更大尺寸语义、叠篆 / 官印结构（后期） |

## 17.4 完整 Profile 结构（V2.0 细化）

```json
{
  "code": "han_private",
  "nameZh": "汉私印",
  "nameEn": "Han Private Seal",
  "era": { "from": -202, "to": 220, "labelZh": "西汉—东汉" },
  "preferredScripts": [
    { "script": "han_seal", "weight": 1.0 },
    { "script": "xiaozhuan", "weight": 0.4 }
  ],
  "preferredShapes": [
    { "type": "square", "weight": 1.0 },
    { "type": "rect", "weight": 0.3 }
  ],
  "modeWeights": { "yin": 0.75, "yang": 0.25 },
  "layoutWeights": { "grid_2x2": 1.0, "two_col": 0.8, "huiwen": 0.6 },
  "targetDensityRange": [0.62, 0.82],
  "borderProfile": {
    "types": { "single": 0.7, "thick": 0.3 },
    "widthRange": [0.035, 0.065],
    "irregularity": 0.15,
    "corner": 0
  },
  "glyphStretchRange": { "x": [0.90, 1.12], "y": [0.90, 1.12] },
  "irregularity": 0.15,
  "distressRange": [0.10, 0.45],
  "readingOrder": "huiwen",
  "scoreWeights": {
    "balance": 0.25, "density": 0.25, "whitespace": 0.15,
    "glyphFit": 0.15, "borderRelation": 0.10, "historicalStyle": 0.10
  },
  "edgeAffinity": 0.45,
  "tags": ["方正", "平满", "白文", "私印"],
  "termSlug": "han-seal",
  "descriptionZh": "方正平满，字距紧密，白文为主。",
  "refs": ["《汉印文字征》", "《秦汉南北朝官印征存》"],
  "version": 3
}
```

| 字段 | 作用 |
|---|---|
| `scoreWeights` | **覆盖默认评分权重**——这是"数据驱动"最重要的落点，调风格不需要改代码 |
| `termSlug` | 关联术语，让"汉印"在任何界面都能展开浮层 |
| `descriptionZh` | 供 `explain` 生成风格解读 |
| `refs` | 文献来源，词条与界面都要显示 |
| `version` | Profile 变更需升版本；老项目记录使用的版本，防止"变样" |

## 17.5 Profile 的版本与稳定性

| 规则 | 说明 |
|---|---|
| Profile 修改 = 新版本 | 不原地改数值 |
| 项目记录 | `seal_versions` 记录 `style_profile_version` |
| 重建 | 用记录的版本重建，保证老项目一致 |
| 升级 | 用户可主动"升级到新版风格"，创建新版本而非覆盖 |

## 17.6 Profile 的验证

新增或修改 Profile 时，CI 必须跑：

1. **Golden 渲染**：固定 5 组文字 × 该 Profile，输出 SVG 与基线比对；
2. **区间合法性**：所有 range 的 min < max，权重和归一；
3. **模板可达性**：`layoutWeights` 中的模板 id 存在且字数匹配；
4. **术语存在**：`termSlug` 能在 `wiki_terms` 中查到；
5. **人工评审**：由内容 / 文化顾问签字（记录在 PR 中）。

第 5 条不是形式主义——风格参数错了会产出"看起来像但不对"的印章，这类错误代码测试查不出来。

---

# 18. API 设计

## 18.1 总体

内部 API 采用 REST 或 tRPC 均可；对外 API 建议 **REST + 异步导出任务**。

| Endpoint | Method | 作用 |
|---|---|---|
| `/api/seals/generate` | POST | DSL / 简化参数 → 候选方案 |
| `/api/seals/render` | POST | 指定 DSL → SVG / 预览 |
| `/api/projects` | POST | 创建项目 |
| `/api/projects/:id` | GET / PATCH | 读取 / 更新项目元数据 |
| `/api/projects/:id/versions` | POST | 保存版本快照 |
| `/api/exports` | POST | 创建导出任务 |
| `/api/glyphs/search` | GET | 字符与 Variant 搜索 |
| `/api/styles` | GET | 风格 Profile |
| `/api/dictionary/:char` | GET | 字典详情 |
| `/api/historic-seals` | GET | 印库检索 |
| `/api/ai/design` | POST | 自然语言 → 推荐 / DSL |

## 18.2 生成接口的返回约定

> 生成候选时建议返回 **`candidateId` + DSL patch + `previewSvg`**，而非仅图片 URL，方便客户端立即进入编辑。

```json
{
  "ok": true,
  "candidates": [
    {
      "candidateId": "c_01",
      "score": 0.83,
      "dslPatch": { "layout": {…}, "glyphs": […], "border": {…} },
      "previewSvg": "<svg …>",
      "explain": { … },
      "warnings": []
    }
  ],
  "engineVersion": "1.4.2",
  "assetVersion": "2026.08.1",
  "seed": 834921
}
```

## 18.3 新增端点（V2.0）

| Endpoint | Method | 作用 |
|---|---|---|
| `/api/seals/relayout` | POST | 重排章法（保留锁定字形） |
| `/api/seals/redesign` | POST | 重新设计（允许换 Variant） |
| `/api/seals/reimpress` | POST | 重新盖印（仅换 seed） |
| `/api/seals/explain` | POST | DSL → ExplainFacts（供说明面板 / alt 文本） |
| `/api/compliance/check` | POST | 印文与形制合规检查 |
| `/api/compliance/appeal` | POST | 提交误判申诉 |
| `/api/wiki/:slug` | GET | 小百科词条 |
| `/api/wiki/terms` | GET | 术语字典（全量，供客户端打包） |
| `/api/quiz/:setSlug` | GET | 取题 |
| `/api/quiz/:setSlug/submit` | POST | 提交答案与判题 |
| `/api/achievements` | GET | 我的成就（V1.1） |
| `/api/inscriptions` | POST | 边款渲染 |
| `/api/albums/:id/export` | POST | 印谱 PDF 导出任务 |
| `/api/carving-aid` | POST | 刻制辅助稿（反字 + 1:1 PDF） |
| `/api/exercises/:id/submit` | POST | 提交学院课后练习 |

## 18.4 通用响应信封

所有 API 使用统一信封（对应用户全局规则的 API Response Format）：

```json
{
  "ok": true,
  "data": { },
  "error": null,
  "meta": { "total": 120, "page": 1, "limit": 20 }
}
```

失败时：

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "COMPLIANCE_BLOCKED",
    "message": "印文包含国家机关名称",
    "severity": "error",
    "details": { "rule": "GOV_ORG_NAME", "matched": "…" },
    "appealUrl": "/api/compliance/appeal?ref=…"
  }
}
```

错误码全表见附录 E。

## 18.5 幂等与并发

| 端点 | 幂等策略 |
|---|---|
| `POST /api/projects/:id/versions` | 客户端传 `Idempotency-Key`，重复提交返回同一版本 |
| `POST /api/exports` | 相同 `(versionId, format, options)` 24h 内复用已完成任务 |
| `POST /api/seals/generate` | 相同 `(dsl, seed)` 命中缓存，直接返回 |
| `PATCH /api/projects/:id` | 乐观锁：客户端传 `If-Match: <updatedAt>`，冲突返回 409 |

## 18.6 对外 API（Professional）

| 要求 | 说明 |
|---|---|
| 认证 | API Key（Header `X-Fangcun-Key`）+ 可选请求签名 |
| 限流 | 按套餐配额，返回 `X-RateLimit-*` 头 |
| 版本 | 路径版本 `/v1/`，破坏性变更升版本并保留旧版 12 个月 |
| 异步导出 | `POST /v1/exports` 返回 `taskId`，轮询或 webhook |
| 确定性保证 | 请求可指定 `engineVersion`，不指定则用当前稳定版；响应始终回显实际使用版本 |
| 签名 URL | 导出结果 URL 短期有效（15 分钟） |

## 18.7 知识 API 的特殊设计

`/api/wiki/terms` 返回**全量精简术语字典**（仅 slug + 一句话 + 别名），用于客户端构建期打包或首次访问缓存：

```json
{
  "version": "2026.08.1",
  "terms": [
    { "slug": "baiwen", "zh": "白文", "aliases": ["阴文"], "oneLiner": "印文凹陷，钤出后字为白色、底为红色。" }
  ]
}
```

约 60 条、20KB gzip，`Cache-Control: public, max-age=86400, stale-while-revalidate=604800`。术语浮层因此**零网络延迟**（DESIGN.md D-801）。

完整词条（含正文、图、参考文献）走 `/api/wiki/:slug`，按需加载。

---

# 19. 项目保存、版本与随机种子

## 19.1 版本模型

- 编辑器内使用 **command / history 模型**实现 Undo/Redo；短期历史**只在客户端**；
- **显式保存或关键操作**生成持久化 version snapshot；
- 每个 version 保存**完整 DSL**（或 base + patch，**V1 推荐完整 JSON** 便于稳定）；
- 记录 **`engine_version` 和 `glyph_asset_version`**，防止未来引擎升级导致老项目"变样"；
- 若用户选择"升级到新版引擎"，**创建新版本而不是覆盖旧版本**。

## 19.2 自动打点规则（V2.0 细化）

哪些操作产生持久化版本：

| 操作 | 产生版本 |
|---|---|
| 显式保存 | ✓ |
| 导出 | ✓（保证导出结果可追溯） |
| 切换朱白 / 印式 / 风格 | ✓ |
| 重排章法 / 重新设计 | ✓ |
| 更换字形 Variant | ✓ |
| 拖动滑块 | ✗（仅进客户端 history） |
| 移动字形 | ✗（松手后合并为一步 history） |
| 关闭页面前 | ✓（若有未保存改动，静默保存为 autosave 版本） |

`autosave` 版本在时间线中折叠显示，避免刷屏。

## 19.3 客户端草稿

| 要求 | 说明 |
|---|---|
| 存储 | `localStorage` / IndexedDB，键为 `draft:{projectId ?? 'anon-N'}` |
| 频率 | 每 30s 或每次关键操作后（DESIGN.md D-303） |
| 内容 | 完整 DSL + `engineVersion` + 最后编辑时间 |
| 未登录 | 最多保留 5 个匿名项目；登录后批量迁移 |
| 冲突 | 本地草稿比服务端新时提示用户选择，**不自动覆盖** |
| 离线 | Service Worker 缓存引擎与字形资产，离线可继续编辑（DESIGN.md D-307） |

## 19.4 Undo/Redo 模型

```
Command {
  id, type, before: Partial<DSL>, after: Partial<DSL>, timestamp, mergeable
}
```

| 要求 | 说明 |
|---|---|
| 深度 | ≥ 50 步（DESIGN.md D-302） |
| 合并 | 连续同类型且 `mergeable` 的命令在 300ms 内合并（如拖动滑块） |
| 不可撤销操作 | 导出、发布不进 history |
| seed 变更 | "重新盖印"是可撤销命令 |
| 内存 | 只存 patch 不存完整 DSL，50 步约 100KB |

## 19.5 seed 的生命周期

| 时机 | 行为 |
|---|---|
| 首次生成 | 由 `hash(text + timestamp)` 生成 rootSeed，写入 DSL |
| 后续编辑 | seed **不变**，保证残损形态稳定 |
| "重新盖印" | 生成新 rootSeed |
| "换一批" | 每个候选用 `deriveSeed(rootSeed, 'candidate', i)`，用户可预期 |
| Remix | 继承源的视觉参数（含 seed），新印文重新生成 Glyph；`meta.remixOf` 固定 Gallery 来源，再由用户调整 |
| 手动输入 | UI 暴露 rootSeed 输入框，粘贴即可复现他人结果 |
| API | 请求可显式指定 seed；不指定则服务端生成并回显 |

## 19.6 重建保证

`rebuild(dsl, engineVersion, assetVersion, seed)` 必须满足：

```
∀ 已保存版本 v:
  rebuild(v.dsl, v.engine_version, v.asset_version, v.seed)
    ≡ 该版本创建时的几何输出
```

这由 `rebuild_consistency` 指标持续监控（目标接近 100%，见 28.1），并在 CI 中以 golden case 形式回归。

**允许的差异**：抗锯齿、位图重采样、micro 尺度噪声。**不允许的差异**：任何矢量路径坐标变化。

---

# 20. 知识内容系统技术架构

> **V2.0 全新章节。PRD.md §10.2 与附录 A 引用本章（`TECH.md §20`）。章节号不得变更。**
>
> 本章是"Knowledge as Data"原则（§1.3）的落地，对应 PRD 第 10 章「印章知识普及体系」与 DESIGN.md 第 15 章「印章知识普及界面体系」。

## 20.1 系统目标

把散落在产品各处的"印章知识"收敛为**一套结构化数据 + 一个解析层**，使同一条知识可以被以下场景复用而只维护一份：

| 场景 | 消费方式 |
|---|---|
| 术语浮层（DESIGN 15.2 L1） | `oneLiner` + 缩略图 |
| 知识卡（L2） | `oneLiner` + 触发规则 |
| 小百科词条页（L3） | 全字段 + SSG |
| 印面标注层（15.3） | `termSlug` ↔ 引擎 `annotations[]` |
| 概念对比组件（15.4） | `wiki_media` 的 `compare` 资产 |
| 小测解释（15.5） | `oneLiner` |
| AI 推荐理由（16.4） | `termSlugs` |
| 字形 / 风格元数据 | `glyph_variants.term_slugs`、`style_profiles.termSlug` |
| SVG `<desc>` 与 alt 文本 | 由 `explain` + 术语中文名组装 |
| 学院课程正文 | MDX 中的 `<Term slug="…">` |

## 20.2 wiki_terms 表结构

```sql
CREATE TABLE wiki_terms (
  id            uuid PRIMARY KEY,
  slug          text UNIQUE NOT NULL,        -- URL 路径，发布后不可变
  term_zh       text NOT NULL,               -- 白文
  term_zh_hant  text,                        -- 白文（繁）
  term_en       text,                        -- Baiwen
  term_en_gloss text,                        -- Intaglio Seal
  term_ja       text,
  pronunciation text,                        -- bái wén
  aliases       text[] DEFAULT '{}',         -- {阴文, 陰文}
  category      text NOT NULL,               -- mode|style|layout|material|tool|process|form|era
  one_liner_zh  text NOT NULL,               -- ≤ 40 字，浮层与知识卡使用
  one_liner_en  text,
  body_md       text,                        -- 词条正文（Markdown）
  misconception text,                        -- "很多人以为…其实…"
  related_slugs text[] DEFAULT '{}',
  seal_ids      uuid[] DEFAULT '{}',         -- 相关历史印
  lesson_slugs  text[] DEFAULT '{}',         -- 相关课程
  refs          jsonb DEFAULT '[]',          -- [{title, author, year, url}]
  certainty     text DEFAULT 'established',  -- established|debated
  cta           jsonb,                       -- {label, dslPatch} 生成入口
  status        text DEFAULT 'draft',        -- draft|published|deprecated
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON wiki_terms USING gin (aliases);
CREATE INDEX ON wiki_terms (category, status);
```

| 字段 | 设计理由 |
|---|---|
| `slug` 不可变 | 词条页要被搜索引擎收录，改 slug 等于丢流量；改名走 alias + 301 |
| `aliases` | 用户可能搜"阴文"，术语识别也要匹配到；GIN 索引支持数组查询 |
| `one_liner_zh` **非空** | 强制每个术语都有一句话——没有一句话的术语无法进浮层，等于没做 |
| `misconception` | 对应 DESIGN.md 15.2 L3 的"常见误解"，是词条最有价值的部分 |
| `certainty` | `debated` 的词条在界面加"一说"标注（PRD 17.3 文化表述规范） |
| `cta.dslPatch` | 词条页"生成一枚白文印"按钮携带的参数，数据驱动而非硬编码 |
| `refs` | 每个词条必须有出处（DESIGN.md D-809） |

## 20.3 wiki_media 表

```sql
CREATE TABLE wiki_media (
  id         uuid PRIMARY KEY,
  term_slug  text REFERENCES wiki_terms(slug),
  kind       text NOT NULL,      -- compare|diagram|example|thumb
  asset_key  text NOT NULL,      -- 对象存储 key（SVG 优先）
  caption_zh text,
  caption_en text,
  pair_key   text,               -- 成对概念的配对标识，如 'zhu-bai'
  side       text,               -- left|right（成对时）
  sort       int DEFAULT 0
);
```

`pair_key` + `side` 支撑 DESIGN.md 15.4 的概念对比组件：查 `pair_key='zhu-bai'` 得到左右两张图，组件不需要知道具体是哪两个术语。

## 20.4 术语识别（Term Linking）

把任意中文文本中的术语自动转成可点击浮层，用于 AI 理由、风格描述、课程正文。

### 20.4.1 算法

```
buildTrie(terms):
  收集所有 term_zh + aliases，构建 Aho-Corasick 自动机（或最长匹配 Trie）

linkTerms(text, options):
  1. 用自动机扫描，得到所有匹配区间
  2. 冲突消解：优先最长匹配；等长时优先 term_zh 而非 alias
  3. 应用 once 策略：同一 slug 在同一段落只链接首次出现
  4. 跳过已在链接 / 代码 / 引号内的区间
  5. 返回 [{ text, slug? }] 片段数组
```

| 选项 | 默认 | 说明 |
|---|---|---|
| `once` | `paragraph` | `paragraph` / `document` / `all` |
| `minLength` | 2 | 单字术语不自动链接（如"印"太泛，会满屏下划线） |
| `exclude` | `[]` | 排除的 slug（如当前词条自身） |
| `maxPerParagraph` | 3 | **防止一段话里挂满浮层**——密度过高反而没人点 |

`maxPerParagraph` 是这套机制成败的关键：全文标满虚线下划线会让正文变成"雷区"，用户干脆不读。

### 20.4.2 性能

- 自动机在构建期生成，序列化为静态资产（约 15KB）；
- 客户端 `linkTerms` 对 1000 字文本 < 2ms；
- 服务端渲染的内容页在构建期预处理，运行时零成本。

## 20.5 explain → 人话（Knowledge Composer）

引擎输出结构化事实（§9.4），Knowledge 层负责组装成句子。**模板存于数据，不在代码里**：

```json
{
  "id": "seal_summary",
  "locale": "zh-Hans",
  "template": "{charCount}字{mode}{style}，{layout}，{density}。",
  "slots": {
    "charCount": { "type": "number", "suffix": "" },
    "mode":      { "type": "term", "field": "modeTermSlug" },
    "style":     { "type": "term", "field": "styleTermSlug" },
    "layout":    { "type": "enum", "map": { "grid_2x2": "田字布局", "two_col": "两列纵排" } },
    "density":   { "type": "enum", "map": { "full": "字距紧密", "loose": "疏朗有致" } }
  }
}
```

渲染结果：`四字白文汉印，田字布局，字距紧密。`——其中"白文""汉印"自动带浮层。

| 输出目标 | 模板 |
|---|---|
| Studio 说明面板 | `seal_summary` |
| SVG `<desc>` / alt 文本 | `seal_alt`（纯文本，无链接） |
| 知识卡 | `card_{trigger}` |
| 分享文案 | `share_caption` |

**多语言由此免费获得**：换一套 locale 模板 + 术语表的 `term_en`，英文界面自动得到 `A four-character baiwen Han seal…`。

## 20.6 知识卡触发引擎

对应 DESIGN.md 15.2 L2 的触发规则表，实现为**数据驱动的规则集**：

```json
{
  "cardId": "first_baiwen",
  "trigger": { "event": "generate_done", "when": "explain.mode == 'yin'" },
  "termSlug": "baiwen",
  "priority": 10,
  "frequency": { "maxPerDay": 1, "maxTotal": 3, "dismissible": "permanent" }
}
```

| 机制 | 说明 |
|---|---|
| 条件表达式 | 受限 DSL（仅比较 / 逻辑运算），**不用 `eval`** |
| 优先级 | 同一事件命中多条规则时取最高优先级的一条，**一次只出一张卡** |
| 频次记录 | 存 `localStorage`（匿名）或 `user_prefs`（登录） |
| 总开关 | `user_prefs.knowledgeHints = false` 时全部不出（DESIGN.md D-1006） |
| 埋点 | 每次展示 / 点击 / 关闭都上报，`knowledge_disabled` 是红线指标（28.2） |

## 20.7 小测数据结构

```sql
CREATE TABLE quiz_items (
  id         uuid PRIMARY KEY,
  set_slug   text NOT NULL,          -- 'intro'
  kind       text NOT NULL,          -- mode|era|reading_order|style|find_error
  prompt_zh  text NOT NULL,
  asset_key  text,                   -- 题图（印面 SVG）
  dsl        jsonb,                  -- 或由 DSL 现场渲染题图
  options    jsonb NOT NULL,         -- [{id, label_zh}]
  answer     text NOT NULL,
  explain_zh text NOT NULL,          -- 立即反馈的解释
  term_slugs text[] DEFAULT '{}',
  difficulty int DEFAULT 1,
  sort       int DEFAULT 0
);
```

| 设计点 | 说明 |
|---|---|
| `dsl` 字段 | 题图可以是**现场渲染的 DSL** 而非固定图片——同一道"这是朱文还是白文"可以每次换字，防止背答案 |
| `explain_zh` **非空** | 答错必须立刻给解释（DESIGN.md 15.5），这是小测的全部价值所在 |
| 判题位置 | **服务端**判题（`/api/quiz/:set/submit`），答案不下发到客户端 |
| 匿名可答 | `quiz_attempts.user_id` 可空，用匿名 id 关联 |
| 无排行榜 | 表结构中**故意不设计** rank / streak 字段（DESIGN.md 15.5「无压力」） |

## 20.8 成就判定（V1.1）

```json
{
  "code": "shi_zhu_bai",
  "nameZh": "识朱白",
  "sealText": "朱白",
  "condition": { "event": "quiz_completed", "when": "setSlug == 'intro' && score >= 4" }
}
```

| 机制 | 说明 |
|---|---|
| 判定时机 | 事件驱动，在对应 API 成功后异步判定 |
| 幂等 | `user_achievements` 主键 `(user_id, achievement_code)`，重复授予无副作用 |
| 条件表达式 | 同 20.6 的受限 DSL |
| 无倒扣 | 成就只增不减 |

### 20.8.1 知识地图聚合（V2）

个人知识地图由 `@fangcun/knowledge/knowledge-map` 提供静态节点契约与纯函数判定。输入只有三组最小证据：已开始课程 slug、已完成课程 slug、已获 achievement code；输出为 `unexplored | learning | mastered`。节点同时携带相关统一术语 slug 和下一步课程 / 小测入口，UI 不复制知识正文。

Web 端只读取现有 `fangcun.learning-progress.v1` 与 `fangcun:achievements:v1`。**不新增知识地图 localStorage key、数据库表、错题记录或答题明细**；因此登录同步仍复用 `learning_progress` 与 `user_achievements` 的既有 RLS / 合并规则。未作答或答错无法形成负面档案，入门小测达到既定门槛后才通过 `shi_zhu_bai` 印记成为掌握证据。

`/academy/map` 与 `/en/academy/map` 在客户端 hydration 后派生同一份状态；静态首屏保持完整节点与导航，无脚本时仍可阅读知识路径，只是不显示本机进度。判定函数覆盖空状态、开始、完成、掌握印记和未知值忽略，避免内容扩展改变旧证据含义。

## 20.9 内容工作流

```
内容团队撰写（Markdown / 表格）
   → PR 提交到 content 仓库或后台录入
   → CI 校验（见 20.10）
   → 文化顾问评审签字
   → 合并 → 构建期生成静态术语字典 + SSG 词条页
   → 发布，更新 wiki_terms.updated_at
```

**术语字典版本化**：`/api/wiki/terms` 返回的 `version` 字段随内容发布递增，客户端据此失效缓存。

## 20.10 内容 CI 校验

| 校验 | 规则 |
|---|---|
| `one_liner_zh` 长度 | ≤ 40 字，非空 |
| `slug` 格式 | `^[a-z0-9-]+$`，唯一，未与已发布 slug 冲突 |
| `refs` 非空 | 已发布词条必须有至少一条参考文献 |
| `related_slugs` 可达 | 引用的 slug 都存在 |
| 术语闭环 | 被 `glyph_variants.term_slugs` / `style_profiles.termSlug` / `quiz_items.term_slugs` 引用的 slug 必须存在 |
| 禁用表述 | 正文不得出现"必须""唯一""最正宗""完美复刻"（PRD 17.3） |
| 绝对年代 | `certainty = 'debated'` 的词条，正文中的年代须带"一说 / 传" |
| 图片 | `wiki_media` 的成对资产必须成对存在（`pair_key` 下恰好 2 条） |
| 死链 | `refs[].url` 可达性抽检 |

## 20.11 知识系统的性能与缓存

| 资源 | 策略 |
|---|---|
| 术语精简字典 | 构建期打包 + `max-age=86400, SWR=7d` |
| 词条页 | SSG，内容变更触发增量重建 |
| 词条媒体（SVG） | 内容哈希路径，`immutable, max-age=1y` |
| Aho-Corasick 自动机 | 构建期序列化，随字典一起分发 |
| 标注层几何 | 来自引擎 `explain`，与几何缓存同生命周期 |
| 小测题目 | 服务端渲染题图并缓存，答案不缓存到边缘 |

## 20.12 知识系统需求映射

| DESIGN.md 需求 | 本章对应 |
|---|---|
| D-801 浮层不阻塞、可键盘 | 20.11 零延迟字典（前端实现） |
| D-802 知识卡频次 | 20.6 `frequency` |
| D-803 统一靛青 | 前端 Token，非本章 |
| D-804 首批 60 术语 | 20.2 表 + 附录 F 种子数据 |
| D-805 标注层无 JS 降级 | 20.5 `seal_alt` 模板生成图注列表 |
| D-807 答错不用红色 | 20.7 `explain_zh` + 前端样式 |
| D-809 出处与更新时间 | 20.2 `refs` / `updated_at` |
| D-810 DefinedTerm 结构化数据 | 21.5 SEO 结构化数据 |

---

# 21. 搜索、字典与印库数据架构

## 21.1 定位

> 字典与印库既是**内容系统**也是 **Seal Engine 的数据入口**。搜索首版可直接使用 PostgreSQL **trigram / full-text + character 精确索引**；数据量大后再引入专用搜索服务。

## 21.2 索引重点

| 对象 | 索引重点 |
|---|---|
| **Glyph** | `character, unicode, script, era, tags` |
| **Historic Seal** | `title, text, era, type, institution, tags` |
| **Academy** | `title, keywords, fulltext` |
| **Gallery** | `text, style, creator, tags` |

新增（V2.0）：

| 对象 | 索引重点 |
|---|---|
| **Wiki Term** | `slug, term_zh, aliases, category` |
| **Quiz** | `set_slug, kind` |

## 21.3 搜索实现

```sql
-- 字典：精确字符优先，其次拼音/部首，最后模糊
CREATE INDEX glyphs_char_idx     ON glyphs (character);
CREATE INDEX glyphs_pinyin_idx   ON glyph_variants USING gin (pinyin);
CREATE INDEX glyphs_trgm_idx     ON glyphs USING gin (character gin_trgm_ops);

-- 印库：中文全文检索
ALTER TABLE historic_seals ADD COLUMN search_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title,'') || ' ' ||
                          coalesce(inscription,'') || ' ' ||
                          coalesce(institution,''))
  ) STORED;
CREATE INDEX ON historic_seals USING gin (search_tsv);
```

**中文分词说明**：PostgreSQL 默认无中文分词。MVP 采用 `simple` 配置 + trigram 模糊匹配（对短文本如印文足够）；数据量增大后引入 `pg_jieba` 或外部搜索服务。印章文字通常 ≤ 8 字，trigram 效果可接受。

## 21.4 检索排序

| 场景 | 排序 |
|---|---|
| 字典单字 | 精确匹配 → 按 `era` 时代先后 → 按"适合入印"标签 |
| 字形选择器"仅推荐" | 按当前 `style.preferredScripts` 权重 → `confidence` → `era` |
| 印库 | 相关度 → 精选标记 → 时代 |
| 术语 | 精确 slug → term_zh 前缀 → alias → 模糊 |

## 21.5 SEO 与结构化数据

> SEO 页应**服务端渲染**，字典字符页使用**稳定 slug / Unicode 编码策略**并生成 **canonical**；历史印详情包含**结构化元数据和来源信息**。

### 21.5.1 URL 策略

| 页面 | URL | 渲染 |
|---|---|---|
| 字典单字 | `/dictionary/天`（URL 编码）+ canonical | SSG（高频 3500 字）/ ISR（其余） |
| 小百科 | `/wiki/baiwen` | SSG |
| 印章详情 | `/seals/guangling-wang-xi` | SSG |
| 时代页 | `/seals/era/han` | SSG |
| 学院课程 | `/academy/intro/zhu-bai` | SSG |

汉字 URL 使用**原字**而非 Unicode 码点（`/dictionary/天` 而非 `/dictionary/U+5929`），对中文搜索更友好；同时保留码点形式做 301 重定向。

### 21.5.2 结构化数据

| 页面 | Schema.org 类型 |
|---|---|
| 小百科词条 | `DefinedTerm` + `DefinedTermSet`（对应 D-810） |
| 字典单字 | `DefinedTerm` + `ImageObject`（各字形） |
| 印章详情 | `VisualArtwork` + `CreativeWork`，含 `dateCreated` / `material` / `holdingArchive` |
| 学院课程 | `Article` / `LearningResource` |
| 作品 | `CreativeWork` |

示例（词条）：

```json
{
  "@context": "https://schema.org",
  "@type": "DefinedTerm",
  "@id": "https://fangcun.app/wiki/baiwen",
  "name": "白文",
  "alternateName": ["阴文", "Baiwen"],
  "description": "印文凹陷于印面，钤盖后文字呈白色、底呈红色。",
  "inDefinedTermSet": {
    "@type": "DefinedTermSet",
    "name": "方寸印章小百科",
    "@id": "https://fangcun.app/wiki"
  }
}
```

### 21.5.3 内容页性能

| 指标 | 目标 |
|---|---|
| 单字页 TTFB | ≤ 200ms（DESIGN.md D-602） |
| 字形首屏可见 | 内联首屏 4 个字形 SVG，其余懒加载 |
| 词条页 LCP | ≤ 1.8s |
| sitemap | 分片生成（字典 / 词条 / 印库 / 课程各一份），每片 ≤ 5 万条 |

### 21.5.4 学院课程打印与投屏

`/academy/lesson/[slug]` 继续通过 `generateStaticParams()` 预渲染五个课程路径。服务端页面不读取 `searchParams`；标题、MDX 正文、Seal Engine SVG 与打印用双图降级都进入同一份静态 HTML。一个局部客户端控制器读取 `present=1`，只更新根节点的 `data-lesson-display`、退出链接和 Esc 监听，因此分享投屏 URL 不会把课程路由改为动态渲染。

打印调用浏览器原生 `window.print()`，由 `@page { size: A4 portrait; }` 和 `@media print` 负责版式。打印态隐藏导航、操作、练习和当前互动选择，改为显示每个互动组件预先服务端生成的全部权威 SVG 变体；禁止截图替代、客户端重绘或为讲义另建内容副本。投屏与打印仅记录 `lesson_display_mode_changed`、`lesson_handout_printed` 及课程 slug，不采集印文、学生身份或课堂数据。

### 21.5.5 私有课堂合集与练习模板

练习模板由 `@fangcun/knowledge/classroom-exercises` 提供稳定 ID、中英文任务 / 教师提示、时长和参数化 Studio URL；它们是静态知识内容，在未配置 Supabase、未登录和离线阅读状态下仍可使用。`/academy/classroom` 与 `/en/academy/classroom` 共享一个客户端视图；邀请码详情为动态私有路由并设置 `noindex, nofollow`，不会进入 sitemap。

私有课堂不复用公开 `gallery_collections`：Gallery 只引用审核通过的公开作品，而课堂允许未公开的学生版本并必须保持班内隔离。迁移 `20260815180000_classroom_collections.sql` 建立：

| 对象 | 关键字段与约束 |
|---|---|
| `classroom_collections` | `owner_id`、1–80 字标题、三个白名单 `exercise_id`、唯一 8 位十六进制 `join_code`、`open / closed` |
| `classroom_submissions` | `collection_id`、`student_id`、项目 / 版本引用、可空 1–40 字别名、冻结 DSL / Engine / Glyph Asset 版本；`(collection_id, student_id)` 唯一 |
| `resolve_classroom_collection` | 登录用户凭邀请码读取标题、练习、状态、创建时间与 `is_owner`；不返回教师 UUID、邮箱或 Auth 元数据 |
| `submit_classroom_work` | 从 `(auth.uid(), project_id)` 对应的 `seal_projects.payload.versions[]` 查找真实版本，原子写入 / 覆盖最终稿；课堂关闭、项目未同步、版本不存在均抛稳定错误码 |

两张 `public` 表均启用 RLS。课堂拥有者只能管理自己的课堂；提交查询允许课堂拥有者读取该课堂全部行，或学生读取 `student_id = auth.uid()` 的自己行。`anon` 没有表和 RPC 权限；`authenticated` 对提交表只获准读取非身份列，连课堂拥有者也不能经 Data API 选择 `student_id`。课堂表更新权限进一步缩到 `title / status`。两个 `security definer` RPC 都固定 `search_path`、先检查 `auth.uid()`、撤销 `PUBLIC / anon` 默认执行权再仅向 `authenticated` 授权；提交 RPC 永远从调用者自己的同步项目提取快照，不接受客户端上传 DSL。数据库 lint、安全 / 性能 advisor 与真实多账户 REST / RPC 测试是该迁移的必过门槛。

前端 `classroom-store.ts` 对邀请码、标题和别名做同构边界校验，并用 `normalizeSealDsl()` 校验所有返回快照。教师与学生预览继续调用权威 `/api/seals/render`，不在课堂层重写引擎或复制 SVG。课堂不保存邮箱、机构花名册、成绩、错题、排名或公开状态；当前“教师”即课堂拥有者，不引入可伪造的 `user_metadata` 角色判断。

## 21.6 数据入口双重身份

字典与印库不只是内容页，它们向引擎提供数据：

| 内容对象 | 引擎用途 |
|---|---|
| `glyph_variants` | 字形资产（§7） |
| `historic_seals.metadata.styleHints` | "以此风格生成"的 DSL patch 来源 |
| `style_profiles` | 风格参数（§17） |
| `wiki_terms` | `explain` 的术语解释（§20.5） |

因此内容变更必须触发：SSG 重建 + 术语字典版本递增 + 引擎 golden case 回归（若涉及字形 / 风格）。

---

# 22. 边款、印谱与刻制辅助

> **V2.0 全新章节。** 对应 PRD §9.11–9.13 与 DESIGN.md 10.6–10.8。

## 22.1 边款 Inscription

### 22.1.1 数据结构

```json
{
  "enabled": true,
  "side": "front",
  "text": "丙午年方寸刻",
  "script": "lishu",
  "knife": "double",
  "faces": [
    { "side": "front", "text": "丙午年方寸刻" },
    { "side": "back", "text": "于杭州" }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `faces[].side` | `left` / `right` / `front` / `back`；每个方位最多一项，最多四面 |
| `faces[].text` | 单面款识，按 Unicode 码点限制为 32 字 |
| `script` | 全局边款书体：`kai` 楷 / `xingshu` 行 / `lishu` 隶 |
| `knife` | 全局阴刻刀法：`single` 单刀 / `double` 双刀 |
| `side` / `text` | 兼容旧项目的首面镜像；新代码统一通过 `getInscriptionFaces()` 读取 |

### 22.1.2 渲染

边款不走 Seal Engine 的印面管线，而是独立的**侧面展开渲染器**：

```
1. 从 `faces[]` 按正面 → 右侧 → 背面 → 左侧排序，空面不参与输出
2. 竖排文字从右至左分列，每列最多 10 字；书体与刀法作为可复现元数据进入输出
3. 拓片渲染器输出带方位、书体和刀法标注的黑底白字 SVG，不进入 Seal Engine 印面几何
4. 3D Adapter 从同一 `faces[]` 派生彩色纹理与灰度凹凸贴图；纹理与 R3F 资源在卸载时释放
5. 方 / 长方印使用四面平面贴合；圆印按正、右、背、左映射到四段 90° 圆柱 UV；椭圆印暂用圆柱近似并返回 `ELLIPSE_INSCRIPTION_UV_APPROXIMATED`
6. 单刀使用 `0.012` 浅凹凸，双刀使用 `0.026` 深凹凸并加宽线口；参数由 Adapter 确定性派生，不回写 DSL 或印面几何
7. WebGL 不可用时，静态事实仍展示边款面数、方位、字数、贴合方式与刀痕深浅，印面 SVG 海报继续可用
```

当前 R7 实现以可编辑、多面持久化、拓片 SVG、方印平面贴合、圆印曲面 UV、单 / 双刀轻量凹凸、八种数据化材质、三件来源尺寸驱动的历史印教学模型，以及由权威 Seal Engine SVG 中 `data-char` Glyph 路径派生的印面浅层轮廓网格为验收边界。印面轮廓网格只用于 3D 预览：朱文为浅凸起、白文为浅凹入，深度固定为 `0.032` 场景单位且不超过 `0.04`；它不回写 DSL、不改变印面 SVG、不进入 PNG / PDF / DXF / CNC。边款仍使用其楷 / 行 / 隶书体纹理。真实字体轮廓的高精度布尔挖刻、扫描复原与生产加工几何仍未完成，不得在界面或验收记录中宣称为扫描、实体雕刻或制造模型。

### 22.1.3 约束

| 约束 | 值 |
|---|---|
| 单侧字数 | ≤ 32 |
| 默认关闭 | `enabled: false`，主流程不受影响 |
| 导出 | 独立黑底白字拓片 SVG；印谱可在后续包含边款页 |
| 不参与印面几何 | 边款变更**不触发**印面重渲染 |

## 22.2 印谱 Album

当前实现采用本地优先的多页工作流：`/album` 与 `/en/album` 从 `fangcun:projects:v1` 读取未归档项目，并在每页选择时固定具体版本；草稿升级为 `fangcun:album:draft:v2`，只保存全局版面字段与每页 `selectedProjectIds[]`、`selectedProjectVersionIds{}`、`selectedHistoricSealSlugs[]`，启动时兼容迁移旧版单页草稿。用户可逐页新增、删除、前后切换，最多 24 页；题名、题跋和版式作用于整册，PNG / 单页 PDF 只输出当前页，而整册 PDF 会重新派生每页权威 SVG 并按当前顺序写入同一个矢量 PDF。前端最多并发渲染两页、同 DSL 请求去重；服务端最多接收 24 页、单页 1.5MB、整册 8MB 的带 `data-fangcun-output="album-page"` 输出，避免任意 PDF 输入或无界资源使用。未配置服务或未登录时不会上传印文或创建云端记录。登录且先完成账户项目同步后，用户可另存、更新、载入或删除自己的多页云端印谱；`albums` / `album_items` 只保存页数、版面字段、`project_id + version_id` 引用和三枚受控历史 slug，绝不保存 Seal DSL、文物图像或公开可见性。保存路径 `save_album` 是受限 `SECURITY INVOKER` RPC，原子替换整册条目；RLS、表权限与 RPC 校验同时要求页码不超过保存的页数、项目版本存在于当前用户的 `seal_projects`，因此不会跨账户引用或静默降级为当前版本。历史印从详情页 `?historic=<slug>` 或左栏拖放 / 按钮进入，渲染时只使用该条目现有 Seal DSL 的教学复原，并以 `historic:<slug>`、`历史印教学参考 · {机构}`（英文等价文案）进入 `AlbumItem`；绝不写入 `fangcun:projects:v1`、创建可编辑项目、复制文物笔画或暗示原始钤本。桌面 HTML5 拖放只是一条快捷路径，按钮始终是键盘与移动端等价入口。所有者可显式调用受限 `create_album_share`：它只接受无历史印参考、已同步且存在指定版本的专辑，在单一事务内把版面字段和版本中的 `dsl` 冻结到私有 `album_share_links` / `album_share_items`，并用新随机令牌使旧链接立即失效。公开路由 `/album/share/:token` 与 `/en/album/share/:token` 不读取源专辑；仅服务端持有 service-role 的 BFF 按未撤销令牌查询，校验并只返回题名、版面、图注和冻结 DSL，绝不返回账户、专辑或项目 ID。匿名角色没有两个分享表的权限；公开页只读、无导出，渲染仍由 `Seal DSL → Seal Engine SVG → @fangcun/album` 派生。

### 22.2.1 数据结构

```sql
CREATE TABLE albums (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text NOT NULL,       -- 1–40 字
  layout     text NOT NULL,       -- ceye|jingzhe|grid
  page_size  text NOT NULL,       -- a4|a5
  per_page   int NOT NULL,        -- 1|2|4|6|9
  page_count int NOT NULL,        -- 1–24
  colophon   text NOT NULL,       -- ≤120 字题跋
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE album_items (
  album_id            uuid REFERENCES albums(id) ON DELETE CASCADE,
  project_id          text NULL,  -- 用户已同步的项目 ID
  version_id          text NULL,  -- 同项目中不可变版本 ID
  historic_seal_slug  text NULL,  -- ying-qu|da-fu|xin-cheng-jia
  page                int NOT NULL, -- 1–24，且不超过 albums.page_count
  slot                int NOT NULL,
  caption             text,
  PRIMARY KEY (album_id, page, slot),
  CHECK (
    (project_id IS NOT NULL AND version_id IS NOT NULL AND historic_seal_slug IS NULL)
    OR (project_id IS NULL AND version_id IS NULL AND historic_seal_slug IS NOT NULL)
  )
);
```

当前本地项目模型使用稳定文本 ID，而不是未实现的独立 `project_versions` UUID 表，因此实际行保存 `project_id + version_id`；RLS 插入策略和 `save_album` 都在 `seal_projects.payload.versions[]` 中核验该版本确实属于 `auth.uid()`。`CHECK`、`(album_id, page, slot)` 主键与每页来源唯一索引保证每个位置要么放自己的印、要么放三枚规范历史教学参考之一，不能两者都有或都无，也不会把同一版本在同页重复成可回载丢失的数据。`album_share_links` 以 `album_id` 唯一地保存一次显式分享的随机 `token`、撤销状态和冻结版面；`album_share_items` 只保存槽位、图注和冻结 DSL，不保存源项目 ID。两个表也启用 RLS，匿名没有表权限，只有所有者可读写；服务端 service-role 仅获 BFF 所需的 `SELECT`。新版 `save_album` 明确接收 `page_count_input`，事务校验每页容量、页码和来源后再替换整册条目，旧版七参数单页调用仍可用。

实现侧的纯函数契约位于 `packages/album/src/index.ts`：`AlbumItem` 携带完整 DSL、权威 SVG、图注和来源；`deriveAlbumSlots()` 只根据 A4 / A5、版式和每页数量计算毫米槽位；`createAlbumPage()` 输出带 `data-fangcun-output="album-page"`、ARIA 标题、版式和页码元数据的 SVG。若真实印面大于槽位，返回 `ALBUM_ITEM_SCALED_TO_SLOT` 警告；若输入超过页容量，返回 `ALBUM_ITEMS_TRUNCATED_TO_PAGE`，不静默改变 DSL。

### 22.2.2 版面

| `layout` | 说明 |
|---|---|
| `ceye` | 册页——单面单印或双印，天头地脚留白大 |
| `jingzhe` | 经折装——横向连续，折页处不放印 |
| `grid` | 现代网格——每页 1/2/4/6/9 枚 |

### 22.2.3 PDF 导出

```
1. 按 `page_size` 建立页面（A4 = 210×297mm；A5 = 148×210mm）
2. 由 `deriveAlbumSlots()` 按 `layout`、`perPage` 计算毫米槽位和缩放警告；经折装额外绘制折线
3. 每个 slot 复用已渲染的权威印面 SVG，并在 SVG 页面中保留物理尺寸、版本和来源图注
4. `/api/albums/export` 接受单页或最多 24 页、总计不超过 8MB 的带 `data-fangcun-output="album-page"` 受限 SVG，使用 `pdfkit` / `svg-to-pdfkit` 以输入顺序输出矢量 PDF
5. 浏览器 PNG 是当前页同一 SVG 的 4× 像素密度派生物；单页 PDF 保持当前页范围，整册 PDF 重建全部页面并保留每页物理尺寸，打印必须选择 100% / 实际大小
```

## 22.3 刻制辅助 Carving Aid

### 22.3.1 尺寸换算

```
mmToPx(sizeMm, dpi) = sizeMm / 25.4 × dpi
unitToMm(u, sizeMm) = u / 1000 × sizeMm
```

| 输出 | 规范 |
|---|---|
| 1:1 PDF | 页面含 10mm 校验标尺条 |
| 屏幕真实尺寸 | 用 `window.devicePixelRatio` + 用户校准（可选：让用户拿信用卡比对） |
| PNG | DPI 写入元数据，默认 300dpi |

**屏幕 1:1 的诚实处理**：浏览器无法可靠获知物理 DPI。界面必须标注"屏幕显示为近似尺寸，以打印稿为准"，并提供可选的一次性校准（DESIGN.md 10.4 `R` 快捷键）。

### 22.3.2 反字稿

```
mirror(sealSvg):
  对整体应用 transform="scale(-1,1) translate(-1000,0)"
  正稿与反稿并排输出，各自标注：
    正稿（钤出效果）  /  反稿（上石用）
```

**必须并排且标注**：混淆正反会导致刻出的印章钤出来是镜像的，石料报废。这是本功能唯一的真实风险点。

### 22.3.3 石料建议

规则表（非 AI）：

| 字数 | 建议边长 | 说明 |
|---|---|---|
| 1 | 12–20mm | |
| 2 | 15–25mm | |
| 3–4 | 18–30mm | 四字低于 18mm 刀法难施展 |
| 5–8 | 25–40mm | |

叠加规则：白文密度 > 0.8 时建议 +3mm；复杂度总和高时建议 +5mm；用于书画落款时建议 ≤ 作品短边 1/12。

### 22.3.4 输出清单

| 输出 | 内容 |
|---|---|
| 正稿 PDF | 1:1 黑白，含标尺 |
| 反稿 PDF | 1:1 镜像黑白，含标尺 |
| 水印纸版 | 浅灰（30% 黑）便于描摹 |
| 参数卡 | 尺寸、石料建议、一句刻制提示 |

---

# 23. 合规检查器

> **V2.0 全新章节。** 对应 PRD §17.2 与 DESIGN.md 20.5。

## 23.1 定位

合规检查是**产品红线的技术实现**，不是内容审核的附属功能。它在引擎之前执行，对特定输入直接阻断。

## 23.2 规则分层

| 层 | 规则 | 严重度 | 时机 |
|---|---|---|---|
| **L1 印文文本** | 国家机关名称、事业单位公章式表述、敏感词 | `error` | 输入时（debounce 500ms）+ 生成前 |
| **L2 形制组合** | 圆形 + 五角星 + 环形字（公章形制） | `error` | 参数变更时 |
| **L3 身份提示** | 他人姓名 + "之印" | `warning` | 输入时 |
| **L4 发布** | 社区发布内容复检 | `error` | 发布时 |

## 23.3 规则表结构

```json
{
  "code": "GOV_ORG_NAME",
  "layer": "L1",
  "severity": "error",
  "matcher": {
    "type": "regex",
    "pattern": "(人民政府|公安局|人民法院|人民检察院|管理委员会)$"
  },
  "messageZh": "印文包含国家机关名称。伪造、变造国家机关印章属违法行为，方寸不提供此类生成。",
  "suggestionZh": "你可以改用个人姓名、斋号或闲章文字。",
  "appealable": true
}
```

```json
{
  "code": "OFFICIAL_SEAL_FORM",
  "layer": "L2",
  "severity": "error",
  "matcher": {
    "type": "expr",
    "expr": "shape.type == 'circle' && decoration.star == true && layout.strategy == 'ring'"
  },
  "messageZh": "该组合接近公章形制，无法生成。",
  "appealable": true
}
```

## 23.4 执行位置

| 位置 | 权威性 | 说明 |
|---|---|---|
| 客户端 | **非权威** | 快速预检，即时提示，改善体验 |
| 服务端 `/api/compliance/check` | **权威** | 生成、导出、发布前必过 |
| 发布流程 | 权威 | 复检 + 人工抽审 |

**关键**：客户端规则表可被绕过（改前端代码），因此 `/api/seals/generate` 与 `/api/exports` **必须服务端复检**，不信任客户端的"已通过"标记。

## 23.5 误判申诉流程

```
用户点击"这是误判？告诉我们"
   → POST /api/compliance/appeal { subjectType, subject, ruleCode, userNote }
   → 写入 compliance_reviews (decision='pending')
   → 人工审核（SLA 48h）
   → 若判定误判：
       a) 为该用户该输入加白名单（allowlist 条目）
       b) 若规则本身有问题，提 PR 修正规则表
   → 通知用户结果
```

申诉数据是规则质量的主要反馈来源。误判率高的规则应收紧 pattern 或降级为 `warning`。

## 23.6 规则维护

| 要求 | 说明 |
|---|---|
| 规则即数据 | 存于版本化 JSON，随发布分发；**不硬编码** |
| 变更需评审 | 涉及法律边界，规则变更需产品 + 法务确认 |
| 测试 | 每条规则必须有正例（应拦截）与反例（不应拦截）测试用例 |
| 误报监控 | 追踪 `compliance_blocked` 事件与申诉率，申诉成功率 > 20% 的规则需要复审 |
| 不做过度拦截 | **宁可漏判 L3 也不要误伤正常创作**——把"张三之印"拦掉会毁掉核心用例 |

## 23.7 隐私

| 要求 | 说明 |
|---|---|
| 不存储被拦截的印文 | 只记录 `rule_code` 与哈希，除非用户主动申诉 |
| 申诉数据 | 保留 180 天后匿名化 |
| 不上报到第三方 | 合规检查在自有服务内完成 |

---

# 24. 性能、缓存与任务调度

## 24.1 场景策略

| 场景 | 策略 |
|---|---|
| **编辑预览** | 客户端 SVG；交互目标 60fps，复杂残损降低预览精度 |
| **候选生成** | 布局 / 字形可客户端或 BFF；返回 skeleton 后增量渲染 |
| **Glyph 资产** | CDN + 长缓存 + content hash |
| **Style Profile** | 静态 / 边缘缓存 |
| **高分辨率 PNG** | 服务端或浏览器 OffscreenCanvas；大图可任务化 |
| **缩略图** | 生成后缓存，不重复栅格化 |
| **GSAP 动效** | 路由级按需加载；页面离开时 revert；高频输入使用 overwrite / quickTo，不累计 tween |
| **3D 查看器** | 默认 SVG 海报；用户打开或进入近视口时加载 R3F；静止使用 demand frame loop |
| **AI** | 请求级缓存谨慎使用；结构化输出后再由本地引擎渲染 |

## 24.2 复杂度预算

> 建议设置 **path complexity budget**：预览模式较低、SVG 导出中等、高清 PNG 允许更高。对每次残损更新使用 **debounce**，并在拖动滑块时使用**近似 mask**。

（具体数值见 §15.4 与 §13.5）

## 24.3 性能预算表（V2.0 汇总）

| 操作 | 目标 | 上限 | 对应需求 |
|---|---|---|---|
| 首页输入 → 篆化预览 | 150ms | 300ms | D-102 |
| 参数变更 → 预览更新 | 100ms | 200ms | D-201 |
| 生成骨架结果 | 800ms | 1.5s | D-202 |
| 生成完整结果 | 2.5s | 4s | D-202 |
| Studio 参数 → 舞台 | 60ms | 100ms | D-301 |
| 候选生成 p95（不含 AI） | — | 1.5s | 28.1 |
| AI 首 token | 900ms | 1.5s | D-401 |
| 字典单字页 TTFB | 120ms | 200ms | D-602 |
| SVG 导出 | 1.5s | 4s | — |
| PNG 4000px | 3s | 10s（任务化） | — |
| 首页 LCP | 1.6s | 2.0s | D-104 |
| GSAP 动画帧时间 | 16.7ms | 20ms（中端设备） | D-1204 |
| 3D 打开 → 可交互 | 1.5s | 2.5s | FR-309 |
| 3D 稳态帧率（交互中） | 55fps | 45fps（低端降级） | D-1204 |
| WebGL 失败 → SVG 降级 | 100ms | 300ms | D-1209 |

### 24.3.1 3D 场景预算

| 项 | 移动端 | 桌面端 |
|---|---:|---:|
| DPR | 1–1.5 | 1–2 |
| 三角形 | ≤ 100k | ≤ 200k |
| Draw calls | ≤ 50 | ≤ 80 |
| 同屏贴图内存 | ≤ 32MB | ≤ 64MB |
| 阴影 | 1024²，最多 1 盏投影灯 | 2048²，最多 1 盏投影灯 |
| 连续帧循环 | 仅交互 / 转场时 | 仅交互 / 转场时 |

## 24.4 缓存键规范

```
glyph:{assetHash}                          → SVG，immutable 1y
style:{code}:{version}                     → JSON，1d
geo:{geoHash}                              → 几何，1d
imp:{geoHash}:{impHash}                    → 印蜕，1h
svg:{impHash}:{optHash}                    → SVG 串，1h
viewer3d:{geoHash}:{material}:{quality}     → 3D 派生贴图 / GLTF，1d
explain:{geoHash}                          → 事实对象，1d
wiki:terms:{contentVersion}                → 术语字典，1d + SWR 7d
wiki:{slug}:{contentVersion}               → 词条，SSG
export:{versionId}:{format}:{optHash}      → 导出产物，24h 复用
```

`geoHash` 定义：`fnv1a(JSON.stringify(geometryFields) + engineVersion + assetVersion)`，字段顺序由固定的序列化函数保证（不能依赖对象键序）。

## 24.5 任务队列

| 任务 | 优先级 | 超时 | 重试 |
|---|---|---|---|
| PNG ≥ 4000px | 高 | 60s | 2 |
| PDF / 印谱 | 中 | 120s | 2 |
| 缩略图生成 | 低 | 30s | 3 |
| Sitemap 重建 | 低 | 300s | 1 |
| 术语字典重建 | 中 | 60s | 2 |
| 批量 API 导出 | 按套餐 | 300s | 2 |

V1 可用简单的数据库轮询队列；量大后换 Redis / SQS。

## 24.6 前端性能

| 措施 | 说明 |
|---|---|
| 引擎代码分割 | 内容页不加载 Seal Engine（约 60KB gzip） |
| PathKit 懒加载 | 仅白文 / 借边时加载 |
| 字形按需 | 只加载当前印章用到的 Variant |
| 印面 inline SVG | 首屏印章内联，避免额外请求（D-104） |
| 虚拟滚动 | 字形网格、印库列表超过 60 项时启用 |
| Web Worker | 布局评分与残损生成放 Worker，主线程只做 DOM 更新 |
| requestIdleCallback | 预取下一批候选、预热缓存 |
| GSAP 路由隔离 | 首页滚动叙事与 Studio 动效拆 chunk；组件使用 `useGSAP` scope 自动清理 |
| ScrollTrigger 克制 | 首页最多一段 pin；内容列表优先 batch / 一次性进入动画，不创建数百个 trigger |
| R3F 动态加载 | `Canvas` 不进入首屏主 bundle；IntersectionObserver 只预热，不自动创建 WebGL context |
| 3D 资源复用 | geometry / material / texture 按 `geoHash`、材质和分辨率缓存；替换时显式 dispose |
| 3D 自适应质量 | 根据 DPR、长帧率、`saveData` 与设备能力降低阴影、贴图和网格精度 |

**Web Worker 的确定性要求**：Worker 中的引擎必须与主线程同一份代码、同一 seed 派生逻辑，否则会出现"预览与导出不一致"。

---

# 25. 安全、版权与数据治理

## 25.1 资产治理

- **Glyph / 历史印资产必须记录 `source`、`license`、获取时间和使用限制**；
- 无来源的资产不得上线（§6.4 数据库约束强制）。

| 字段 | 说明 |
|---|---|
| `asset_sources.kind` | `museum` / `catalog` / `font` / `self` |
| `license` | 明确的授权文本或 SPDX 标识 |
| `accessed_at` | 获取时间，便于追溯 |
| `usage_limits` | 如"仅缩略图""不可再分发" |

有版权限制的历史印图像：**只提供缩略图 + 外链原始出处，不提供高清下载**（DESIGN.md 12.5）。

## 25.2 用户上传的 SVG

> 用户上传的自定义 SVG（后期）必须 **sanitizer**，禁止 `script`、`foreignObject`、外部 URL。

入站 sanitize 规则与 §15.5 出站相同，额外增加：

| 检查 | 规则 |
|---|---|
| 文件大小 | ≤ 2MB |
| path 点数 | ≤ 20,000 |
| 元素数量 | ≤ 5,000 |
| 嵌套深度 | ≤ 20 |
| 实体展开 | 禁用（XXE / billion laughs） |
| 解析超时 | 3s |

## 25.3 内容审核

> 公开 Gallery 需要**内容审核**；对**伪造政府公章、金融 / 证明类误导使用**建立明确规则和限制（见 §23）。

| 机制 | 说明 |
|---|---|
| 发布前 | 合规规则自动检查（L4） |
| 当前 R7 P2 | 提交先进入 `pending`；只有审核改为 `published` 才能公开读取，用户举报只写入审核队列 |
| 后续运营 | 审核后台、抽样复核、申诉与结果通知需要独立 reviewer 工作流后才可启用 |
| 举报处理 | SLA 48h，结果通知举报者与作者 |
| 下架 | 状态变更非删除，作者可申诉 |
| 累犯 | 多次违规限制发布权限 |

## 25.4 隐私与可见性

- **项目可见性默认 `private`**；公开发布需要用户主动操作；
- 匿名用户数据存本地，登录后迁移；
- 用户可导出全部数据（JSON + SVG 打包，DESIGN.md D-1005）；
- 删除账户时物理清除个人数据，已公开发布的作品可选择保留匿名或一并删除。

| 数据 | 保留 |
|---|---|
| 项目与版本 | 账户存续期间 |
| 导出记录 | 90 天（文件），记录长期 |
| 埋点事件 | 聚合后 13 个月，原始 90 天 |
| AI 对话 | 30 天（用于调试与质量分析），可用户手动清除 |
| 合规申诉 | 180 天后匿名化 |

## 25.5 API 安全

> API 使用 **rate limit、配额和签名 / Key**；**导出 URL 使用短期签名**。

| 措施 | 值 |
|---|---|
| Key 存储 | 只存哈希，创建时明文展示一次 |
| 限流 | 按套餐；返回 `X-RateLimit-Limit/Remaining/Reset` |
| 导出 URL | 15 分钟签名有效期 |
| CORS | 内部 API 同源；对外 API 允许配置来源白名单 |
| 输入校验 | 所有端点走 Zod schema，拒绝未知字段（对外 API 严格模式） |
| 日志 | 不记录完整印文（可能含姓名），只记录长度与哈希 |

## 25.6 AI 的文化与法律边界

> AI 不应把"仿某在世 / 受保护艺术家的精确风格"作为默认卖点；可落到**历史类型和抽象特征**。

技术实现见 §16.7 Explanation 安全过滤。补充：

| 规则 | 实现 |
|---|---|
| 在世艺术家姓名黑名单 | Style Resolver 拒绝匹配，返回"我们只提供历史风格特征" |
| Prompt 注入防护 | 系统提示与用户输入严格分隔；输出必过 Schema |
| 不学习用户作品 | 用户 DSL 不用于训练；如未来需要，必须显式 opt-in |

## 25.7 Web 安全基线

| 头 | 值 |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-{R}'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.fangcun.app; object-src 'none'; frame-src 'none'; base-uri 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

**SVG 的特殊风险**：用户生成的 SVG 若以 `image/svg+xml` 直接服务会带来 XSS 风险。导出下载使用 `Content-Disposition: attachment` + `Content-Type: application/octet-stream`；预览始终内联渲染而非 `<img src="blob:">` 加载外部 SVG。

---

# 26. 国际化与内容本地化

> **V2.0 全新章节。** 对应 PRD §18.3 与 DESIGN.md 4.6 / 22.5。

## 26.1 语言与路由

| 语言 | locale | 路径 | 优先级 |
|---|---|---|---|
| 简体中文 | `zh-Hans` | `/` | P0 |
| English | `en` | `/en` | P1 |
| 繁體中文 | `zh-Hant` | `/zh-Hant` | P2 |
| 日本語 | `ja` | `/ja` | P2 |

## 26.2 三类文本的不同处理

| 类型 | 存储 | 翻译方式 |
|---|---|---|
| **UI 文案** | i18n JSON | 常规翻译 |
| **知识内容** | `wiki_terms` / `academy_lessons` 的多语言列 | **专业翻译 + 文化顾问审校** |
| **引擎生成文本** | §20.5 模板 + 术语表 | 换模板即换语言，**不翻译成品句子** |

第三类是关键设计：`explain` 输出结构化事实，中文和英文各用一套模板组装，避免"翻译机器生成的句子"这种双重失真。

## 26.3 专有名词策略

> 英文界面**不翻译专有名词**（保留 `Zhuwen`、`Baiwen`、`Han seal`），首次出现时用术语浮层给出解释。

| 术语 | 英文呈现 |
|---|---|
| 朱文 | *Zhuwen* (relief seal) |
| 白文 | *Baiwen* (intaglio seal) |
| 章法 | composition (*zhangfa*) |
| 印蜕 | seal impression |
| 边款 | side inscription (*bianfankuan*) |
| 古玺 | *Guxi* (Warring States seal) |

`wiki_terms` 的 `term_en` 存音译，`term_en_gloss` 存意译，界面组合呈现。

## 26.4 度量与格式

| 项 | 规则 |
|---|---|
| 尺寸 | 中文 mm；英文 `25mm (0.98in)` |
| 日期 | 中文 `2026-08-08`；英文 `Aug 8, 2026` |
| 年代 | 中文"西汉 · 公元前 45 年"；英文 `Western Han, 45 BCE` |
| 数字 | 统一阿拉伯数字 |

## 26.5 字体与排版

| locale | UI 字体 | 备注 |
|---|---|---|
| `zh-Hans` | Noto Sans/Serif CJK SC | |
| `zh-Hant` | Noto Sans/Serif CJK TC | 字形有别，不能复用 SC |
| `ja` | Noto Sans/Serif CJK JP | 同上 |
| `en` | Inter / Source Serif | 无需 CJK 分片，包体小得多 |

**印面字形不受 locale 影响**——篆书字形是文物性质的资产，不存在"繁简"之分（篆书本身早于繁简分化）。这一点必须在代码中明确，避免有人对 Glyph 做繁简转换。

## 26.6 内容翻译的完整度策略

| 内容 | 未翻译时的降级 |
|---|---|
| UI 文案 | 回退到 `zh-Hans`（不应发生，CI 检查完整度） |
| 术语 `one_liner` | 回退到中文并标注 `(中文)` |
| 词条正文 | 显示中文原文 + 提示"该词条暂无英文版" |
| 课程 | 未翻译的课程在该语言下**不出现在导航中** |
| 历史印元数据 | 印名、机构名保留原文 + 拉丁转写 |

## 26.7 SEO 的多语言

| 要求 | 说明 |
|---|---|
| `hreflang` | 每页输出全部语言版本的 `alternate` 链接 |
| `canonical` | 各语言版本各自 canonical，不跨语言指向 |
| sitemap | 按语言分片 |
| 结构化数据 | `inLanguage` 字段正确 |

---

# 27. 测试策略

## 27.1 测试分层

| 层 | 测试 |
|---|---|
| **Unit** | DSL normalize、seed、layout score、bbox、transform、border |
| **Golden SVG** | 固定输入 → canonical SVG hash / 结构 diff |
| **Visual Regression** | 典型字符 / 风格截图 diff，允许微小抗锯齿差异 |
| **Property-based** | 随机 DSL 不越界、不产生 NaN、路径合法 |
| **Compatibility** | Chrome / Safari / Firefox + Figma / Illustrator 导入抽测 |
| **E2E** | 输入文字 → 生成 → 编辑 → 保存 → 导出 |
| **Motion E2E** | GSAP 时间线可中断 / 重播，路由切换后无残留 ScrollTrigger，减少动效正确降级 |
| **3D Compatibility** | WebGL2 / WebGL1 降级、context lost、键盘控制、SVG poster fallback |
| **Data QA** | Glyph 缺字、错误 Unicode、来源缺失、重复 Variant |

## 27.2 Golden Case 覆盖

> Golden Case 建议至少覆盖：**一字朱文、二字纵排、三字不等格、四字 2×2、白文高密度、极低 / 极高残损、粗边、圆印、锁定字形后重排**。

### 27.2.1 完整 Golden 清单（V2.0 扩充）

| # | 用例 | 验证点 |
|---|---|---|
| G01 | 一字朱文方印 | 单字居中、视觉重心 |
| G02 | 二字纵排白文 | 两字等分、字距 |
| G03 | 三字不等格古玺 | 不规则 cell、边框 irregular |
| G04 | 四字 2×2 汉印白文 | 回文序、满白密度 |
| G05 | 白文高密度（0.88） | 布尔运算正确、留红均匀 |
| G06 | 残损 0 | 无任何 mask，路径干净 |
| G07 | 残损 100 | 字仍可辨（剩余墨面 ≥ 45%） |
| G08 | 粗边 thick | 边框与白文密度联动 |
| G09 | 圆印 | 圆形 shape、环形边框 |
| G10 | 锁定字形后重排 | 锁定字 variantId 与位置不变 |
| G11 | **界格 tian**（V2.0） | 界格进入几何与导出 |
| G12 | **缺字降级**（V2.0） | 缺字用 fallback 且标记，不中断 |
| G13 | **借边 touch**（V2.0） | 字形与边框相接，不越界 |
| G14 | **长方印 ratio 0.6**（V2.0） | 非方形归一化正确 |
| G15 | **DSL 迁移 0.9→1.0**（V2.0） | 迁移后几何与迁移前一致 |
| G16 | **explain 输出**（V2.0） | 事实字段与 termSlug 正确 |
| G17 | **反字稿镜像**（V2.0） | 镜像后与正稿严格对称 |

每个 Golden Case 断言三件事：SVG 结构 hash、path 坐标（4 位小数）、`explain` 对象。

## 27.3 确定性测试

**最重要的一类测试**，直接对应 `rebuild_consistency` 指标：

| 测试 | 断言 |
|---|---|
| 同 DSL + seed 重复 100 次 | 输出逐字节一致 |
| Node vs 浏览器（Playwright 取值） | path 字符串一致 |
| Worker vs 主线程 | 一致 |
| 增删字形 | 未变动字的残损形态不变（seed 按 index 派生） |
| 只改 `paste.color` | 几何完全不变 |
| 只改 `impression.inkUneven` | 字形残损不变（seed 通道独立） |

## 27.4 Property-based 测试

```
∀ 随机合法 DSL：
  1. serialize(render(dsl)) 是合法 SVG（可被 XML 解析器解析）
  2. 所有 path 坐标 ∈ [-50, 1050]（允许边缘轻微溢出，不允许失控）
  3. 无 NaN / Infinity
  4. 所有子路径闭合
  5. 渲染耗时 < 5s
  6. 未抛出未捕获异常（降级可以，崩溃不行）
```

随机 DSL 生成器覆盖：1–8 字、全部 shape、全部 mode、全部 style、参数在边界值与随机值之间。种子固定，失败可复现。

## 27.5 视觉回归

| 项 | 规范 |
|---|---|
| 工具 | Playwright screenshot + pixelmatch |
| 断点 | 320 / 768 / 1024 / 1440（对应 web/testing 规则） |
| 页面 | 首页（含滚动叙事关键帧）、生成器（结果态）、Studio、印库详情（含 3D 海报 / 标准视角）、字典单字、词条页、小测 |
| 主题 | 亮色 + Studio 暗色 |
| 容差 | 0.1% 像素差（抗锯齿） |
| 基线更新 | 需 reviewer 确认，不允许自动接受 |

3D 视觉回归固定相机、灯光、模型 seed 与渲染尺寸；优先比较稳定的标准视角海报。GPU 抗锯齿差异使用独立阈值，不能因此放宽普通 UI 的 0.1% 容差。

## 27.6 无障碍测试

| 测试 | 工具 / 方式 |
|---|---|
| 自动检测 | `axe-core`，**0 critical**（D-1408） |
| 键盘路径 | Playwright 模拟四条核心流程（DESIGN.md 21.2.2） |
| 对比度 | 构建期检查 Token 组合 |
| alt 完整性 | 所有 `<svg role="img">` 必须有 `<title>` |
| 屏幕阅读器 | 每版本手动走查一次（VoiceOver / NVDA） |
| 减少动效 | E2E 在 `prefers-reduced-motion` 下跑一遍，断言无自动位移 / 缩放 / scrub；3D 用户主动旋转仍可用 |

### 27.6.1 动效与 3D 专项测试

| 用例 | 断言 |
|---|---|
| 连续输入 10 次 | 只保留最后一次篆化过渡，无 tween 排队、无旧字符闪回 |
| 首页 → Create → 返回 | ScrollTrigger 数量回到进入首页前的基线，无重复注册 |
| 动态字体 / 图片加载 | refresh 后触发点正确，无 pin 跳动 |
| 打开 / 关闭 3D 20 次 | WebGL context、texture、geometry 与 RAF 不持续增长 |
| WebGL 初始化失败 | 300ms 内显示 SVG 海报，操作区与文字数据仍可用 |
| context lost / restored | 不中断项目编辑；可恢复或稳定降级 |
| 2D 修改印文 | 3D 印面更新，材质和相机角度不重置 |
| 页面切到后台 | GSAP 非必要循环与 R3F 连续渲染暂停 |

## 27.7 Data QA

| 检查 | 频次 |
|---|---|
| Glyph 质检（§7.5） | 每次资产变更 |
| 来源完整性（`source_id` 非空） | 每次发布 |
| 术语闭环（§20.10） | 每次内容变更 |
| 字典覆盖率（高频 3500 字） | 每周报表 |
| 历史印元数据完整度 | 每次发布 |
| 重复 Variant 检测 | 每次导入 |
| 死链检查 | 每周 |

## 27.8 合规规则测试

每条规则必须有：

```
positive: ["XX市人民政府", "XX县公安局"]        // 必须拦截
negative: ["张三之印", "清风明月", "政通人和"]   // 必须放行
```

`negative` 用例比 `positive` 更重要——误伤正常创作的代价远高于漏判。

## 27.9 覆盖率目标

| 模块 | 目标 |
|---|---|
| `seal-engine` 核心 | ≥ 90%（这是产品的心脏） |
| DSL / Schema / 迁移 | 100% 分支 |
| Knowledge Composer | ≥ 85% |
| Compliance | 100% 规则覆盖 |
| API 层 | ≥ 80% |
| UI 组件 | ≥ 70%（其余由视觉回归覆盖） |
| 整体 | ≥ 80% |

---

# 28. 可观测性与质量指标

## 28.1 核心指标

| 指标 | 目标 / 用途 |
|---|---|
| `candidate_generation_p95` | 交互生成延迟；MVP 建议 **< 1.5s**（不含 AI） |
| `preview_frame_time` | 编辑器拖动 / 缩放流畅度 |
| `render_failure_rate` | 非法路径、布尔失败、导出失败 |
| `glyph_missing_rate` | 用户输入字符的资产覆盖度 |
| `candidate_selection_rate` | 候选质量的产品代理指标 |
| `svg_size_p95` | 避免残损导致过大文件 |
| `ai_valid_dsl_rate` | AI 输出通过 Schema / Validator 的比例 |
| `rebuild_consistency` | 同 DSL + 版本 + seed 重建一致率，**应接近 100%** |

## 28.2 新增指标（V2.0）

| 指标 | 目标 | 说明 |
|---|---|---|
| `boolean_fallback_rate` | < 1% | 布尔运算降级比例，高说明几何库有问题 |
| `layout_fallback_rate` | < 2% | 布局无解回退比例 |
| `distress_timeout_rate` | < 0.5% | |
| `compliance_block_rate` | 监控 | 突增可能是规则误判 |
| `compliance_appeal_success_rate` | < 20% | **超过说明规则过严**（§23.6） |
| `knowledge_card_ctr` | ≥ 12% | 对应 DESIGN.md 23.3 |
| `knowledge_disabled_rate` | **≤ 5%** | **红线指标**——超过说明知识提示太打扰 |
| `term_popover_open_rate` | 监控 | 哪些术语最令人困惑，指导内容优先级 |
| `quiz_completion_rate` | ≥ 60% | |
| `academy_to_create_rate` | ≥ 8% | 学习 → 创作转化 |
| `explain_missing_term_rate` | 0 | `explain` 引用了不存在的 termSlug，属于数据 bug |
| `motion_long_frame_rate` | < 2% | 动效运行期间超过 50ms 的长帧比例 |
| `viewer_3d_ready_p75` | < 2.5s | 用户主动打开到首帧可交互 |
| `viewer_3d_fallback_rate` | 监控 | WebGL / 性能降级比例，按浏览器与设备分组 |
| `webgl_context_lost_rate` | < 0.5% | 超过说明资源或驱动兼容有问题 |

## 28.3 埋点事件

核心事件表见 DESIGN.md §23.1–23.2。技术要求：

| 要求 | 说明 |
|---|---|
| 事件 schema | 版本化，字段变更需升版本 |
| 不含 PII | **不上报印文原文**（可能是真实姓名），只上报字数与哈希 |
| 客户端缓冲 | 批量上报，离线时本地暂存 |
| 采样 | 高频事件（`preview_frame_time`）按 5% 采样 |
| 关联 | 同一会话的事件带 `sessionId`，同一印章带 `geoHash` |

## 28.4 日志与追踪

| 层 | 内容 |
|---|---|
| 请求日志 | method / path / status / 耗时 / userId（哈希）/ engineVersion |
| 引擎日志 | 阶段耗时、降级标记、警告码；**不记录 DSL 全文** |
| 错误 | 结构化错误码 + 堆栈 + `geoHash`（可复现） |
| 追踪 | 生成请求全链路 trace（含 AI 调用） |
| 保留 | 错误 90 天，访问日志 30 天 |

**可复现优先**：引擎错误必须记录足以复现的最小信息（DSL hash + engineVersion + assetVersion + seed），而不是记录整个 DSL——前者可从数据库还原，后者可能含用户姓名。

## 28.5 告警

| 条件 | 级别 |
|---|---|
| `rebuild_consistency` < 99.9% | **P0**（确定性被破坏是致命问题） |
| `render_failure_rate` > 1% | P1 |
| `candidate_generation_p95` > 3s | P1 |
| `viewer_3d_ready_p75` > 4s | P2 |
| `webgl_context_lost_rate` > 1% | P1；自动关闭 `viewer3d.enabled` 高风险设备段 |
| `ai_valid_dsl_rate` < 90% | P2 |
| `knowledge_disabled_rate` > 5% | P2（产品信号） |
| `compliance_appeal_success_rate` > 20% | P2 |
| 导出任务积压 > 100 | P1 |

---

# 29. 部署与 CI/CD

## 29.1 Monorepo 结构

> Monorepo 建议：`apps/web`、`packages/seal-engine`、`packages/design-tokens`、`packages/dsl-schema`、`services/render`（如需）。

### 29.1.1 完整结构（V2.0 细化）

```
fangcun/
├── apps/
│   ├── web/                    Next.js 主应用
│   └── admin/                  内容后台（后期）
├── packages/
│   ├── seal-engine/            核心引擎（纯函数，无 IO）
│   ├── dsl-schema/             Zod/JSON Schema + 迁移函数
│   ├── design-tokens/          Token 定义 + CSS Variables 生成
│   ├── seal-3d/                Seal DSL → R3F geometry / texture 适配层
│   ├── knowledge/              术语字典、Composer、Term Linking
│   ├── compliance/             合规规则与检查器
│   ├── glyph-tools/            资产导入 / 标准化 / 质检（Node CLI）
│   └── ui/                     共享组件库
├── content/
│   ├── wiki/                   术语与词条（Markdown + frontmatter）
│   ├── academy/                课程（MDX）
│   ├── quiz/                   题库（JSON）
│   └── styles/                 Style Profile（JSON）
├── services/
│   └── render/                 服务端渲染 Worker（如需）
└── docs/                       PRD.md / DESIGN.md / TECH.md
```

**`seal-engine` 的零依赖约束**：其 `package.json` 的 `dependencies` 只允许纯计算库（几何、噪声、哈希）。CI 检查禁止引入 `fs` / `http` / 数据库客户端。

## 29.2 CI 流水线

> 每次 PR 运行 **TypeScript、unit、golden SVG、关键 visual regression**。

```
PR 打开
 ├─ 1. 格式与 Lint（prettier / eslint / stylelint）
 ├─ 2. TypeScript 类型检查（全仓）
 ├─ 3. 单元测试 + 覆盖率门槛（§27.9）
 ├─ 4. Golden SVG 回归（17 个用例）
 ├─ 5. 确定性测试（§27.3）
 ├─ 6. Property-based（固定种子 500 例）
 ├─ 7. 内容 CI 校验（§20.10）—— 仅当 content/ 变更
 ├─ 8. 合规规则测试（§27.8）
 ├─ 9. 视觉回归（关键页 × 4 断点）
 ├─ 10. 无障碍自动检测（axe）
 ├─ 11. 动效生命周期测试（GSAP / ScrollTrigger cleanup）
 ├─ 12. 3D smoke test（标准视角 / WebGL fallback / context lost）
 ├─ 13. 构建 + 包体检查（超预算则失败）
 └─ 14. Vercel 预览部署 + Preview Smoke（健康接口、核心路由、SVG、溢出、控制台与密钥泄漏）
```

## 29.3 包体预算

| 入口 | JS (gzip) | CSS |
|---|---|---|
| 内容页（首页 / 字典 / 词条） | ≤ 150KB | ≤ 30KB |
| 生成器 | ≤ 260KB | ≤ 40KB |
| Studio | ≤ 380KB | ≤ 50KB |
| PathKit WASM | 单独懒加载，不计入 | — |
| 首页 GSAP / ScrollTrigger chunk | ≤ 50KB，按路由加载，不计入内容页公共 chunk | — |
| 3D R3F chunk | ≤ 320KB，用户打开时加载，不计入首屏 | — |

超预算 CI 失败，需显式豁免。

## 29.4 版本与数据变更

> - **Glyph / Style 数据变更单独版本化**，并生成变更报告；
> - 生产发布记录 **app version、engine version、asset version**；
> - **高风险引擎变更采用 feature flag**；老项目默认继续使用原 `engine_version`。

### 29.4.1 版本号体系

| 版本 | 格式 | 变更条件 |
|---|---|---|
| `appVersion` | semver | 每次发布 |
| `engineVersion` | semver | 引擎行为变化；**几何输出变化必须升 minor** |
| `assetVersion` | `YYYY.MM.N` | 字形库变更 |
| `styleVersion` | 整数，每 Profile 独立 | Profile 参数变更 |
| `contentVersion` | `YYYY.MM.N` | 术语 / 词条 / 课程变更 |

### 29.4.2 引擎升级流程

```
1. 新引擎行为变更 → 升 engineVersion
2. 跑全部 Golden Case，输出「几何差异报告」（哪些用例变了、变了多少）
3. 差异报告需人工评审：是修复还是回归？
4. 部署后：新项目用新版；旧项目版本记录里的 engineVersion 不变
5. 旧项目打开时用记录的版本重建 → 不变样
6. UI 提示"有新版引擎可用"，用户主动升级则创建新版本
```

**多引擎版本共存**：服务端需保留最近 3 个 minor 版本的引擎代码（打包为独立 chunk，按需加载），更老的版本升级到最近的兼容版本并在版本时间线上标注。

## 29.5 发布策略

| 环境 | 说明 |
|---|---|
| Preview | 每个 PR 自动部署；`apps/web` 为根目录，使用 Vercel CLI `58.9.0` 的 `pull → build --target preview → deploy --prebuilt`，部署后运行 `test:e2e:preview` |
| Staging | main 分支自动部署，跑完整 E2E |
| Production | 手动触发，金丝雀 5% → 50% → 100% |
| 回滚 | 应用可即时回滚；**引擎版本不回滚**（老项目已记录版本，回滚反而不一致） |

当前 R0 的 Vercel 项目契约、环境边界、GitHub Secrets 与受保护 Preview 的
自动化访问方式见 [`docs/R0-VERCEL.md`](R0-VERCEL.md)。

## 29.6 Feature Flag

| Flag | 用途 |
|---|---|
| `engine.newLayoutScoring` | 新评分算法灰度 |
| `engine.booleanPathkit` | 布尔运算实现切换 |
| `knowledge.cards` | 知识卡开关（可全局关闭止损） |
| `compliance.strictMode` | 合规严格度 |
| `ai.enabled` | AI 降级开关 |
| `motion.scrollNarrative` | 首页滚动叙事灰度与止损 |
| `viewer3d.enabled` | 3D 查看器总开关 |
| `viewer3d.highQuality` | 高精度材质 / 阴影设备分层 |

Flag 状态随请求返回，便于问题归因。

---

# 30. 开发里程碑

## 30.1 引擎与产品里程碑

| 阶段 | 交付 | 完成标准 |
|---|---|---|
| **M0 基础** | DSL Schema、Glyph 标准化工具、2×2 静态渲染 | 可用固定字形输出合法 SVG |
| **M1 引擎骨架** | 方 / 圆、朱白、3 类脚本、6 布局 | 输入 1–4 字得到多个候选 |
| **M2 编辑器** | 单字选择、缩放 / 平移、边框、Undo/Redo | 实时 SVG 编辑稳定 |
| **M3 印蜕** | seed、多尺度残损、印泥不均 | 同 seed 可复现；滑块实时预览 |
| **M4 数据 / 保存** | Project / Version / Glyph / Style 数据库 | 项目可恢复且不变样 |
| **M5 导出** | PNG / 透明 PNG / SVG | Figma / AI 等常用工具可打开 |
| **M6 内容入口** | 字典 / 精选印库基础数据 | 内容页可跳转生成 |
| **M7 AI（V1.1）** | Prompt → 结构化参数 → DSL | 有效 DSL 率与用户采用率可监控 |

## 30.2 知识系统里程碑（V2.0 新增）

| 阶段 | 交付 | 完成标准 | 依赖 |
|---|---|---|---|
| **K0 数据底座** | `wiki_terms` 表、30 条种子术语、术语字典构建脚本 | 字典可被前端打包，slug 查询可用 | M0 |
| **K1 引擎 explain** | 引擎输出 `ExplainFacts` + `annotations[]` | Golden Case G16 通过 | M1 |
| **K2 浮层与知识卡** | Term Popover、Knowledge Card、触发规则引擎 | 生成后能自动出现一条正确的知识条 | M1、K0、K1 |
| **K3 小百科** | 12 条词条 SSG、`DefinedTerm` 结构化数据 | 词条页可被搜索引擎收录 | K0 |
| **K4 标注与对比** | 印面标注层、概念对比组件 | 印库详情页可逐项高亮并解释 | K1、M6 |
| **K5 小测** | 入门题组 5 题、服务端判题 | 答错立即给解释 | K0 |
| **K6 学院** | 入门轨 5 篇 MDX + 互动组件 + 课后练习 | 从课程可一键带参进编辑器 | K2、M2 |
| **K7 成就（V1.1）** | 成就定义与判定 | 幂等发放，无弹窗 | K5 |

## 30.3 其他新增能力里程碑

| 阶段 | 交付 | 版本 |
|---|---|---|
| **C1 合规检查器** | L1–L4 规则、服务端权威检查、申诉流程 | **MVP 必须**（红线） |
| **P1 刻制辅助** | 真实尺寸、反字稿、1:1 PDF、石料建议 | V1 |
| **P2 边款** | 侧面展开、单 / 双刀、拓片预览 | V2 |
| **P3 印谱** | 版面、分页、题跋、PDF | V2 |
| **I1 国际化** | en 路由、UI 文案、术语英文 | V1.5 |
| **A1 动效底座** | GSAP / `@gsap/react`、Token、盖印时间线、减少动效 | MVP |
| **A2 滚动叙事** | ScrollTrigger“一枚印如何诞生”、移动端静态降级 | V1 |
| **A3 轻量 3D** | R3F Canvas、基础石章、SVG 贴图、标准视角、海报 fallback | V1 |
| **A4 增强 3D** | 材质数据、边款贴合、历史印 3D、2D / 3D 联动 | V2 |
| **A5 真实盖印** | 可拖动盖印、压痕 / 渗开演示、确定性印蜕 | V3 |

## 30.4 关键依赖关系

```
M0 ─→ M1 ─→ M2 ─→ M3 ─→ M5
 │     ├─→ K1 ─→ K2 ─→ K6
 │     ├─→ A1 ─→ A2
 │     └─→ A3 ─→ A4 ─→ A5
 │
 K0 ──────────┬─→ K3
              └─→ K4 ←─ M6
 C1 ─────────────────────→（阻塞 M5 导出与发布）
 M4 ─→ M5
```

**C1 合规检查器是 MVP 的硬阻塞项**：没有它就不能开放生成与导出。它不依赖引擎，可与 M0–M1 并行开发。

---

# 31. 附录

## 31.1 附录 A：核心表结构建议

> 以下为**逻辑字段**，不代表最终迁移脚本。

| 表 | 字段摘要 |
|---|---|
| `glyphs` | `id UUID PK; character text; unicode int; script varchar; metrics jsonb; created_at` |
| `glyph_variants` | `id; glyph_id FK; asset_key; asset_hash; source_id; era; metrics jsonb; tags text[]; version` |
| `style_profiles` | `id; code unique; name; era; params jsonb; constraints jsonb; version` |
| `seal_projects` | `id; user_id; title; visibility; current_version_id; created_at; updated_at` |
| `seal_versions` | `id; project_id; dsl jsonb; seed bigint; engine_version; asset_version; created_at` |
| `historic_seals` | `id; title; inscription; era; seal_type; institution; metadata jsonb; image_key` |
| `exports` | `id; version_id; format; options jsonb; status; object_key; created_at` |

### 31.1.1 V2.0 新增表

| 表 | 字段摘要 |
|---|---|
| `wiki_terms` | `id; slug unique; term_zh; term_en; aliases text[]; category; one_liner_zh; body_md; misconception; related_slugs text[]; refs jsonb; certainty; cta jsonb; status; updated_at` |
| `wiki_media` | `id; term_slug FK; kind; asset_key; caption_zh; pair_key; side; sort` |
| `academy_lessons` | `id; track; slug; title; body_mdx; order; locale; published_at` |
| `quiz_items` | `id; set_slug; kind; prompt_zh; asset_key; dsl jsonb; options jsonb; answer; explain_zh; term_slugs text[]; difficulty; sort` |
| `quiz_attempts` | `id; user_id nullable; anon_id; set_slug; score; answers jsonb; created_at` |
| `achievements` | `id; code unique; name_zh; seal_text; condition jsonb` |
| `user_achievements` | `user_id; achievement_code; earned_at; PK(user_id, achievement_code)` |
| `seal_annotations` | `id; historic_seal_id FK; kind; geometry jsonb; term_slug; note_zh; sort` |
| `inscriptions` | `id; version_id FK; side; text; script; knife_style; params jsonb` |
| `albums` | `id; user_id; title; layout; page_size; per_page; colophon; created_at; updated_at` |
| `album_items` | `album_id FK; project_id + version_id nullable; historic_seal_slug nullable; page; slot; caption; PK(album_id,page,slot)` |
| `compliance_reviews` | `id; subject_type; subject_hash; rule_code; decision; user_note; appealed_at; resolved_at` |
| `asset_sources` | `id; name; kind; license; url; accessed_at; usage_limits` |
| `user_prefs` | `user_id PK; locale; reduced_motion; knowledge_hints bool; advanced_params bool; studio_theme` |

## 31.2 附录 B：算法伪代码

### B.1 生成候选

```
generateCandidates(dsl):
  1. n = normalize(dsl)
  2. glyphSets = loadCandidateGlyphVariants(n.text, n.script, n.style)
  3. templates = layoutTemplates(n.text.length, n.shape, n.style)
  4. candidates = []
  5. for template in templates:
       layout      = fitCells(template, glyphSets, n)
       layout      = localOptimize(layout, scoreFn, constraints)
       paths       = transformGlyphs(layout, glyphSets)
       seal        = compose(paths, n.mode, n.shape, n.border)
       impression  = applyDistress(seal, deriveSeed(n.seed, template.id))
       candidates.push({ dslPatch, score, svg })
  6. return topN(diversify(candidates), 12)
```

### B.2 残损

```
distress(mask, intensity, seed):
  macro    = edgeBiasedBlobs(seedA, intensity)
  meso     = multiScaleNoise(seedB, intensity)
  micro    = fineNoise(seedC, intensity)
  combined = weightedUnion(macro, meso, micro)
  return subtract(mask, combined)
```

### B.3 seed 派生（V2.0 新增）

```
deriveSeed(rootSeed, channel, index = 0):
  return fnv1a(`${rootSeed}:${channel}:${index}`) >>> 0

// 使用
borderSeed  = deriveSeed(root, 'border')
glyphSeed_i = deriveSeed(root, 'glyph', i)
inkSeed     = deriveSeed(root, 'ink')
macroSeed   = deriveSeed(root, 'macro')
```

### B.4 候选多样化（V2.0 新增）

```
diversify(candidates, n = 12):
  sorted   = sortByScore(candidates)          // 稳定排序，含 tie-breaker
  selected = []
  for cand in sorted:
    if selected.length >= n: break
    v = featureVector(cand)                   // [template, mode, densityBand, border, script]
    if minHamming(v, selected.map(featureVector)) >= 2:
      selected.push(cand)
  // 放宽两轮
  for threshold in [1, 0]:
    for cand in sorted:
      if selected.length >= n: break
      if not selected.includes(cand) and minHamming(...) >= threshold:
        selected.push(cand)
  return selected
```

### B.5 术语链接（V2.0 新增）

```
linkTerms(text, dict, opts):
  matches = ahoCorasick(dict.automaton, text)
  matches = resolveOverlaps(matches)          // 最长优先；等长时 term_zh 优先
  matches = filter(matches, m => m.length >= opts.minLength)
  matches = dedupeByScope(matches, opts.once) // paragraph|document|all
  matches = capPerParagraph(matches, opts.maxPerParagraph)
  return splice(text, matches)                // → [{text}, {text, slug}, …]
```

### B.6 知识卡选择（V2.0 新增）

```
selectKnowledgeCard(event, context, rules, history, prefs):
  if not prefs.knowledgeHints: return null
  candidates = rules
    .filter(r => r.trigger.event == event)
    .filter(r => evalExpr(r.trigger.when, context))     // 受限表达式，非 eval
    .filter(r => not history.isPermanentlyDismissed(r.cardId))
    .filter(r => history.countToday(r.cardId) < r.frequency.maxPerDay)
    .filter(r => history.countTotal(r.cardId) < r.frequency.maxTotal)
  return maxBy(candidates, r => r.priority) ?? null     // 一次只出一张
```

## 31.3 附录 C：核心技术验收指标

| 验收项 | 标准 |
|---|---|
| **可复现** | 相同 DSL + `engine_version` + `asset_version` + seed 输出几何一致 |
| **SVG 合法** | 所有 MVP Golden Cases 可被主流浏览器与 Figma 打开 |
| **候选多样性** | 同一 4 字输入至少给出 6 个非简单缩放差异方案 |
| **布局安全** | 字形无非预期越界 / 重叠；历史模板阅读顺序正确 |
| **编辑响应** | 常用参数调整视觉反馈接近实时 |
| **导出一致** | PNG 与 SVG 的主体几何、朱白和边框一致 |
| **资产可追溯** | 上线 Glyph / 历史印均具 `source` / `license` 元数据 |
| **老项目稳定** | 引擎升级后旧版本仍可按原版本重建 |

### 31.3.1 V2.0 新增验收项

| 验收项 | 标准 |
|---|---|
| **知识可复用** | 同一术语在浮层、词条、AI 理由、alt 文本中来自同一数据源，修改一处全站生效 |
| **知识不阻塞** | 关闭 `knowledgeHints` 后，创作全流程功能不缺失 |
| **explain 正确** | 引擎输出的 `termSlug` 全部能在术语库查到（`explain_missing_term_rate = 0`） |
| **标注可降级** | 无 JS 时标注层降级为图注列表，信息不丢失 |
| **合规权威性** | 客户端绕过合规检查后，服务端仍能拦截 |
| **合规不误伤** | 全部 `negative` 用例放行 |
| **反字稿正确** | 反稿与正稿严格镜像对称，标注清晰不可混淆 |
| **1:1 打印准确** | 打印稿实测尺寸误差 ≤ 0.5mm（含标尺校验） |
| **多语言事实一致** | 中英文 explain 描述同一枚印章的事实完全一致，仅表述不同 |
| **动效生命周期安全** | 路由切换、断点变化和组件卸载后无残留 tween / timeline / ScrollTrigger |
| **减少动效完整** | 关闭自动位移动效后，所有状态、读序和 3D 信息仍有静态等价表达 |
| **3D 派生一致** | 3D 印面文字、朱白、印式与当前 Seal DSL / SVG 一致；3D 不反向覆盖几何事实 |
| **3D 渐进增强** | 首屏不加载 R3F；WebGL 失败或低性能模式下 300ms 内稳定降级到 SVG 海报 |
| **3D 资源可回收** | 重复打开 / 关闭 20 次后，WebGL context、RAF 与 GPU 资源无持续增长 |

## 31.4 附录 D：DSL 字段约束表

| 路径 | 类型 | 范围 / 枚举 | 默认 | 层 |
|---|---|---|---|---|
| `version` | string | semver | 必填 | — |
| `text` | string | 1–8 字 | 必填 | 几何 |
| `shape.type` | enum | `square｜rect｜circle｜ellipse｜freeform` | `square` | 几何 |
| `shape.ratio` | number | 0.35–2.8 | 1.0 | 几何 |
| `mode` | enum | `yin`（白文）｜`yang`（朱文） | 由 style 决定 | 几何 |
| `style` | string | style_profiles.code | `han_private` | 几何 |
| `script` | enum | `xiaozhuan｜han_seal｜guxi｜bird_worm｜jinwen｜jiaguwen` | 由 style 决定 | 几何 |
| `layout.strategy` | string | 模板 id | 自动 | 几何 |
| `layout.density` | number | 0.30–0.95 | 由 style 决定 | 几何 |
| `layout.readingOrder` | enum | `traditional｜huiwen｜modern` | 由模板决定 | 几何 |
| `glyphs[].variantId` | uuid | — | 自动 | 几何 |
| `glyphs[].scaleX/Y` | number | 受 `stretch_limits` 约束 | 1.0 | 几何 |
| `glyphs[].dx/dy` | number | −0.15–0.15 | 0 | 几何 |
| `glyphs[].rotate` | number | −6–6（度） | 0 | 几何 |
| `glyphs[].locked` | bool | — | false | 几何 |
| `border.type` | enum | `none｜single｜thick｜double｜irregular｜broken` | `single` | 几何 |
| `border.width` | number | 0.015–0.12 | 0.045 | 几何 |
| `border.distress` | number | 0–1 | 0.18 | 几何 |
| `border.corner` | number | 0–0.06 | 0 | 几何 |
| `grid.type` | enum | `none｜jie｜tian｜ri` | `none` | 几何 |
| `grid.width` | number | 0.008–0.05 | 0.02 | 几何 |
| `impression.distress` | number | 0–1 | 0.24 | 印蜕 |
| `impression.inkUneven` | number | 0–1 | 0.12 | 印蜕 |
| `impression.bleed` | number | 0–0.06 | 0.04 | 印蜕 |
| `impression.seed` | int | uint32 | 自动生成 | 印蜕 |
| `paste.color` | enum | `vermilion｜cinnabar_deep｜vermilion_light｜black` | `vermilion` | 表现 |
| `paste.opacity` | number | 0.7–1.0 | 1.0 | 表现 |
| `paper.color` | enum | `xuan｜mian｜none` | `xuan` | 表现 |
| `paper.texture` | number | 0–0.06 | 0.03 | 表现 |
| `physical.sizeMm` | number | 8–120 | 25 | 元数据 |
| `physical.material` | enum | `qingtian｜shoushan｜changhua｜bahrain｜copper｜jade｜wood｜ceramic｜other` | `qingtian` | 仅影响 3D 派生材质与刻制建议，不改变印面 SVG 几何 |
| `inscription.enabled` | bool | — | false | 附加 |
| `meta.sourceSealId` | uuid? | — | null | 元数据 |
| `meta.exerciseId` | string? | — | null | 元数据 |

**clamp 规则**：超出范围的值一律 clamp 到边界并记录 `warning`，**不抛错**。这保证 AI 或第三方 API 传入越界值时产品仍可用。

## 31.5 附录 E：错误码表

### E.1 DSL 与输入

| Code | Severity | 说明 |
|---|---|---|
| `DSL_VERSION_UNKNOWN` | error | 未知 DSL 版本 |
| `DSL_MIGRATION_FAILED` | error | 迁移失败 |
| `TEXT_EMPTY` | error | 印文为空 |
| `TEXT_TOO_LONG` | warning | 超过 8 字 |
| `TEXT_INVALID_CHAR` | warning | 含不支持字符（表情、控制符） |
| `MISSING_GLYPH` | warning | 字库缺字，已降级 |
| `GLYPH_FALLBACK_SCRIPT` | info | 使用了其他文字体系的字形 |
| `GLYPH_MODERN_SEALIZED` | info | 使用了系统生成的现代篆化字形 |
| `PARAM_CLAMPED` | warning | 参数越界已修正 |

### E.2 引擎

| Code | Severity | 说明 |
|---|---|---|
| `LAYOUT_NO_SOLUTION` | warning | 无可行布局，已用兜底模板 |
| `LAYOUT_LOCK_CONFLICT` | warning | 锁定约束导致部分方案不可用 |
| `BOOLEAN_FALLBACK` | warning | 布尔运算失败，已用描边模拟 |
| `DISTRESS_TIMEOUT` | warning | 残损生成超时，已降精度 |
| `GLYPH_OVERFLOW` | warning | 字形超出安全区 |
| `RENDER_FAILED` | error | 渲染失败 |

### E.3 导出

| Code | Severity | 说明 |
|---|---|---|
| `SVG_COMPLEX` | warning | SVG 复杂度高，建议简化 |
| `SVG_SIMPLIFIED` | info | 已自动简化 |
| `FORMAT_NOT_ALLOWED` | error | 当前套餐不支持该格式 |
| `EXPORT_TIMEOUT` | error | 导出超时 |
| `SIZE_OUT_OF_RANGE` | error | 请求尺寸超限 |

### E.4 合规

| Code | Severity | 说明 |
|---|---|---|
| `COMPLIANCE_BLOCKED` | error | 命中阻断规则（`details.rule` 给出具体规则码） |
| `COMPLIANCE_WARNING` | warning | 命中提示规则（如他人姓名） |
| `COMPLIANCE_APPEAL_PENDING` | info | 申诉处理中 |

### E.5 AI

| Code | Severity | 说明 |
|---|---|---|
| `AI_UNAVAILABLE` | warning | AI 不可用，已降级为规则推荐 |
| `AI_SCHEMA_INVALID` | warning | 模型输出不合规，已重试 / 降级 |
| `AI_RATE_LIMITED` | error | 超出配额 |
| `AI_CONFLICT_RESOLVED` | info | 意图冲突已自动裁决（`details.conflicts`） |

### E.6 系统

| Code | Severity | 说明 |
|---|---|---|
| `UNAUTHORIZED` / `FORBIDDEN` | error | 认证 / 授权 |
| `NOT_FOUND` | error | |
| `CONFLICT` | error | 乐观锁冲突 |
| `RATE_LIMITED` | error | |
| `MOTION_INIT_FAILED` | warning | 动效初始化失败；直接显示最终状态 |
| `WEBGL_INIT_FAILED` | warning | WebGL 不可用；已降级 SVG 海报 |
| `WEBGL_CONTEXT_LOST` | warning | 3D 上下文丢失；尝试恢复或降级 |
| `VIEWER3D_ASSET_FAILED` | warning | 3D 派生资源加载失败；保留 2D 预览 |
| `INTERNAL` | error | 内部错误（附 traceId） |

## 31.6 附录 F：术语库种子数据（首批 30 条）

MVP 必须完成的 30 条术语（对应 §2.2、D-804 的 MVP 部分）：

| # | slug | 中文 | 类别 | 一句话（≤40 字） |
|---|---|---|---|---|
| 1 | `zhuwen` | 朱文 | mode | 印文凸起，钤出后字为红色、底为白色。又称阳文。 |
| 2 | `baiwen` | 白文 | mode | 印文凹陷，钤出后字为白色、底为红色。汉代最常见。 |
| 3 | `manbai` | 满白 | mode | 白文的一种，笔画粗、留红少，整体近乎满红。 |
| 4 | `xizhuwen` | 细朱文 | mode | 朱文的一种，笔画细劲，留白疏朗，元明以后多见。 |
| 5 | `guxi` | 古玺 | style | 战国时期的印章，形制自由，边框不规则，字形大小不一。 |
| 6 | `han-seal` | 汉印 | style | 汉代印章，方正平满，字距紧密，以白文为主。 |
| 7 | `qin-seal` | 秦印 | style | 秦代印章，多带界格，布局规整，介于古玺与汉印之间。 |
| 8 | `niaochong` | 鸟虫篆 | style | 笔画作鸟虫形的装饰性篆书，多见于战国至汉的私印。 |
| 9 | `miuzhuan` | 缪篆 | style | 汉代印章专用的篆书体，笔画平直方折，便于填满印面。 |
| 10 | `zhangfa` | 章法 | layout | 印面上文字的排列与疏密安排，是篆刻的整体设计。 |
| 11 | `jiege` | 界格 | layout | 印面内的分隔线，用于区分文字，秦印中常见。 |
| 12 | `huiwen` | 回文 | layout | 四字印的一种读序：右上、右下、左上、左下。 |
| 13 | `jiebian` | 借边 | layout | 字形与边框相接或共用一笔，使章法更紧凑。 |
| 14 | `yinbian` | 印边 | form | 印面外围的框线，朱文为实线，白文为留红外圈。 |
| 15 | `bianfankuan` | 边款 | form | 刻在印章侧面的文字，记录作者、时间或诗句。 |
| 16 | `yinniu` | 印钮 | form | 印章顶部的雕饰，如龟钮、瓦钮，兼具穿绳与身份标识。 |
| 17 | `yinni` | 印泥 | material | 钤印所用的红色膏状物，以朱砂与油、艾绒制成。 |
| 18 | `qianyin` | 钤印 | process | 把印章蘸印泥后按压在纸上的动作。 |
| 19 | `yintui` | 印蜕 | process | 印章钤在纸上留下的痕迹，是印章的"照片"。 |
| 20 | `tapian` | 拓片 | process | 用墨拓取器物或边款上文字的方法，黑底白字。 |
| 21 | `cansun` | 残损 | process | 印面因磨损、崩口形成的缺失，是年代与刀意的体现。 |
| 22 | `feibai` | 飞白 | process | 笔画中的断续白痕，来自刀刻的力度与石质。 |
| 23 | `fanzi` | 反字 | process | 刻印前写在石上的镜像字稿，钤出后才是正字。 |
| 24 | `shangshi` | 上石 | process | 把印稿转写到印石表面的步骤。 |
| 25 | `chongdao` | 冲刀 | process | 刀锋沿笔画方向推进的刻法，线条爽利。 |
| 26 | `qiedao` | 切刀 | process | 刀锋分段下切的刻法，线条含蓄有波折。 |
| 27 | `xianzhang` | 闲章 | form | 内容为诗句、成语或吉语的印章，不用于署名。 |
| 28 | `mingzhang` | 名章 | form | 刻姓名或字号的印章，用于书画署名与凭信。 |
| 29 | `yinpu` | 印谱 | form | 汇集印蜕并装订成册的书，是学习篆刻的主要资料。 |
| 30 | `qingtian` | 青田石 | material | 浙江青田所产印石，质地细腻易刻，为常用印材。 |

**后续 30 条**（完整 60 条见 DESIGN.md 15.2）：斋号印、收藏印、肖形印、押印、封泥、田字格、日字格、朱白相间、并笔、单刀、双刀、寿山石、昌化石、巴林石、篆刻、金石、印床、拓包、款识、边跋、阴刻、阳刻、玺、宝、章、印信、图章、方寸、小篆、金文。

每条种子术语入库时必须填齐：`one_liner_zh`、`category`、`refs`（至少一条）、`related_slugs`、`cta`。

---

# 方寸

**方寸之间，自有天地。**

> 引擎的目标不是画出一个红色方块，而是让同一份参数在十年后依然长成同一枚印章。
