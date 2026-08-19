# 方寸 Fangcun · 开发路线图（ROADMAP）

> **方寸之间，自有天地。**

这份路线图把 [PRD.md](docs/PRD.md)、[DESIGN.md](docs/DESIGN.md) 和 [TECH.md](docs/TECH.md) 中已经确定的范围、依赖和验收标准整理成可执行的开发顺序。

它回答三件事：**先做什么、什么条件下才能进入下一阶段、哪些能力明确延后**。它不是日历承诺；`T0` 指项目正式进入实现阶段的第一周，默认每个迭代为两周。实际日期由团队容量、字形资产准备和内容审核进度决定。

## 1. 当前基线

| 项目 | 当前状态 |
|---|---|
| 产品定义 | PRD V2.0 已完成 |
| 设计规范 | DESIGN V2.0 已完成，包含 GSAP 动效与 React Three Fiber 3D 规范 |
| 技术规范 | TECH V2.0 已完成，包含 Seal Engine、知识系统、动画 / 3D 架构 |
| 可运行应用 | R0 已建立 `apps/web` Next.js 路由壳与五个规划入口 |
| 当前路线图状态 | R0 本地与 Vercel Preview 验收完成，待提交完整代码基线并配置 GitHub Secrets 后启用 PR 自动部署；R1、R2 本地交付完成；R3 待真实 G1；R4 仅待实物打印；R5、R6 本地交付完成；R7 已交付多面边款、材质切换、圆印曲面 UV、刀法凹凸、首批历史印 3D、多页私有印谱、可撤销分享链接、个人知识地图、课程 A4 讲义 / 投屏模式及 Gallery 审核 / 申诉 / Remix / 收藏合集闭环，平台化其余范围继续推进 |
| 版本原则 | MVP 先验证生成闭环；V1 做内容与轻量 3D；V2 做平台化；V3 做真实盖印与开放能力 |

## 2. 版本地图

| 版本 | 用户得到什么 | 主要交付 | 预计迭代窗口* |
|---|---|---|---|
| MVP | 输入文字，得到并导出一枚传统印章 | M0–M3、M5、C1、K0–K2、L0 前 3 课、A1、核心生成器 / Studio、PNG / SVG | T0–T0+14 周 |
| V1 | 能学习、保存、复用，并看到轻量 3D 印章 | M4、M6、K3–K6、A2–A3、P1、字典、学院、滚动叙事、轻量 3D | MVP 后 10–12 周 |
| V1.1 | 用自然语言生成并获得创作成就 | AI 篆刻师、K7 成就、AI 降级与解释闭环 | V1 后 4 周 |
| V1.5 | 国际用户可理解并使用核心功能 | I1 英文路由、UI 文案、术语英文、事实一致性校验 | V1.1 后 4 周 |
| V2 | 逛印库、做边款、排印谱、发布作品 | 历史印库、Gallery / Remix、P2–P3、K5–K7 扩展、A4 增强 3D、教育版、国际化 | V1.5 后 12 周 |
| V3 | 体验真实盖印并接入外部生产 | A5 真实盖印、篆刻过程动画、实体刻制、Seal API、知识 API、EPS / DXF / CNC | V2 后分阶段 |

\* 窗口以两周迭代估算，不能替代正式排期。若团队没有并行 owner，应优先保留依赖顺序而不是压缩质量门槛。

MVP 的 M5 先提供基于当前 DSL 的临时 PNG / SVG 导出；M4 在 V1 完成项目与版本持久化，再补齐带 `versionId` 的权威导出、复现与历史版本交付。

## 3. 主开发计划

| 阶段 | 时间盒 | 里程碑 | 交付范围 | 前置依赖 | 进入下一阶段的条件 | 状态 |
|---|---|---|---|---|---|---|
| R0 基础设施 | T0–T0+2 周 | Scaffold | `apps/web`、pnpm workspace、Turborepo、路由壳、Design Tokens、环境配置、CI 骨架、Feature Flag 壳、事件 schema、Vercel Preview Smoke | 无 | 本地可启动；Preview 可部署；没有把密钥提交到仓库；代码基线已进入远程仓库 | 进行中（待基线提交 / CI Secrets） |

R0 当前证据：创建 `fruitsai/fangcun` Vercel 项目并将根目录设为 `apps/web`、Node 设为 `22.x`；`apps/web/vercel.json` 固定 Next.js / pnpm 安装与构建命令；新增 `/api/system/health`，只返回 `appVersion`、`engineVersion`、`assetVersion` 与映射环境，不返回 secrets；`preview-smoke.spec.ts` 覆盖核心中英文路由、SVG 生成、横向溢出、浏览器错误与服务端密钥泄漏。当前 Preview `https://fangcun-7d4cw07ta-fruitsai.vercel.app` 为 READY，健康接口返回 staging、`0.1.0` / `0.1.0` / `2026.08.2`，受保护 Preview 已完成桌面 / 移动 Smoke 2/2；本地 lint、typecheck、unit、build 与 Preview Smoke 均通过。完整代码目前仍未进入远程 Git 基线，GitHub Actions 所需 `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`、`VERCEL_AUTOMATION_BYPASS_SECRET` 也尚未配置，因此 R0 保持待基线提交 / CI Secrets 状态。
| R1 引擎与安全底座 | T0+2–6 周 | M0 / C1 / K0 / A1 | DSL Schema、Glyph 导入与质检、2×2 静态 SVG、Seal Engine 最小管线、服务端合规检查、30 条术语种子、GSAP Token / `useGSAP` 基础、减少动效 | R0 | G01–G02 Golden 通过；服务端能拦截红线；输入与最终 SVG 有稳定数据契约 | 完成 |
| R2 生成能力 | T0+6–10 周 | M1 / K1 | 方 / 圆、朱白、三类脚本、6 种章法、候选生成、`explain` 与 `annotations[]`、首页实时篆化预览 | R1 | G01–G10、G16 通过；候选生成 P95 < 1.5s；同 DSL + seed 可复现 | 完成 |
| R3 Studio 与 MVP 闭环 | T0+10–14 周 | M2 / M3 / M5 / K2 | 快速生成器、Studio、单字 Variant、边框、残损 / 印泥、Undo / Redo、PNG / SVG、术语浮层、L0 前 3 课、字典 / 印库种子页、首次盖印时间线、无障碍核心流程 | R2 | 5 位无背景用户可完成输入 → 生成 → 调整 → 导出；导出一致；无减少动效阻塞；G1 MVP Gate 通过 | 进行中 |
| R4 V1 内容与渐进增强 | MVP 后 0–6 周 | M4 / M5 完善 / M6 / K3–K6 / P1 / A2–A3 | 项目保存与版本、完整字典入口、精选印库、知识卡扩展 / 标注层 / 小百科 / 学院、滚动叙事、真实尺寸 / 反字稿、按需加载的 R3F 轻量 3D、SVG 海报降级 | R3；K0 / K1 | G17 反字稿通过；3D 打开 → 可交互 P75 ≤ 2.5s；WebGL 失败 ≤ 300ms 降级；3D 不进入首屏 bundle | 进行中 |
| R5 V1.1 智能化 | V1 后 0–4 周 | M7 / K7 | Prompt → Intent → DSL、AI 解释、安全过滤、缓存、成就定义与幂等发放 | R4 | 有效 DSL 率 ≥ 90%；AI 不可用时规则推荐可用；成就重复触发不重复发放 | 完成 |
| R6 国际化 | V1.1 后 0–4 周 | I1 | `/en` 路由、核心 UI 英文、术语英文、尺寸英制辅助、`explain` 事实一致性测试 | R5；内容审核 owner 到位 | 中英文同一 DSL 的几何事实一致；核心流程无混合语言 | 完成 |
| R7 V2 平台化 | V1.5 后 0–12 周 | P2 / P3 / A4 / K5–K7 扩展 | 历史印库、高级字典、Gallery / Remix、边款、印谱、教育模式、3D 材质 / 多视角 / 边款贴合、识印小测与知识地图 | R6；M6；A3 | 历史来源字段完整；公开作品审核可用；3D 视角 / 材质切换不改变 DSL 几何；印谱 PDF 实测尺寸正确 | 进行中 |
| R8 V3 开放与实体 | V2 后分阶段 | A5 / API | 可拖动真实盖印、压痕 / 印泥视觉仿真、篆刻过程动画、实体刻制链路、Seal API / 知识 API、EPS / DXF / CNC | R7；法务与生产合作方 | API 版本化与限流可用；真实盖印最终印蜕仍由 Seal Engine 确定性生成；生产导出有人工抽检 | 计划 |

R1 验收证据：`packages/seal-engine/src/golden.test.ts` 固定 G01 / G02 SVG hash 与结构；`/api/compliance/check` 和 `/api/seals/generate` 已完成本地请求验证。Glyph 资产 `2026.08.2` 已从带授权与固定哈希的 CNS11643《说文解字》、JFZSKSealScript V3 和 OpenCC 映射生成 10,180 个基础 SVG Variant，覆盖 8,925 个输入字符，并保留来源字、可信度、现代篆化标记及质量报告；甲骨文、金文、缺字古玺、汉印篆和鸟虫篆以确定性规则按需扩展到同等输入覆盖，始终标记为现代生成，后续逐字文物摹本可自动覆盖。服务端按 Unicode 分片加载，Web 静态示例使用版本化 SVG Sprite，生产冷请求 41ms、热请求 7ms，首页首载 117KB。R2 验收证据：`/create` 已接入三候选生成与候选切换，`/api/seals/explain` / `/api/seals/relayout` 已返回结构化事实与锁定字形重排结果；G01–G10、G16 Golden、100 次字节级确定性测试均已通过，本地 100 次候选生成 P95 为 0.283ms；首页已使用 Seal Engine SVG 实时预览，Playwright 桌面 / 移动交互与视口检查共 4 项通过。Preview 部署仍属于 R0 待办，不影响 R2 本地验收结论。

R3 当前证据：`/create` 候选可进入 `/studio`；Studio 已支持印式、形状、密度、边框、残损、seed、重新盖印、单字 Variant 选择 / 来源 / 锁定、50 步 Undo / Redo、本地草稿、离线保留、参考网格和 PNG / 透明 PNG / SVG 导出；PNG 由服务端合规复检后的权威 SVG 在浏览器按需栅格化。统一术语库已提供拼音、最长匹配与键盘可操作的非模态浮层；L0 前 3 课已生成静态课程页并连接创作练习，版本化本地进度支持开始、完成、刷新恢复与继续下一课。`docs/UI/` 原型已完成响应式页面重构并沉淀 Design Tokens 与公共组件；思源宋体、思源黑体和参数等宽字体已通过 Fontsource WOFF2 分片自托管，字体 E2E 验证实际命中与同源请求。首次盖印已使用 scoped `useGSAP` 时间线实现，仅在首次生成、重新生成或主动“重新盖印”时播放；减少动效模式直接显示最终印面。核心五路由的桌面 / 移动 axe 审计均为 0 critical；自动化 G1 代表性任务已完成输入 → 生成 → 选方案 → 调整 → 导出 1000px PNG，桌面 5.4s、移动 4.1s。[G1 五人测试脚本](docs/G1-USABILITY-TEST.md) 已准备但未填入虚构结果。当前 55 项单元 / Golden 测试、48 项桌面 / 移动 E2E 与 22 个静态页面构建通过。R3 仅待 5 位真实无背景用户的脚本验收。

R4 当前证据：新增纯函数 `@fangcun/seal-3d`，只从 Seal DSL 派生石章截面、尺寸、材质与钮式；Studio 的 SVG 海报阶段不加载 R3F，用户主动打开后才动态载入 `three.js`、React Three Fiber 与 drei。查看器使用 `frameloop="demand"`，支持拖动 / 缩放、印面 / 侧面 / 印钮标准视角、静态材质与尺寸信息，并在 `saveData`、WebGL 初始化失败、context lost 或资源失败时保留海报。`pnpm benchmark:3d` 会创建隔离生产构建，在 Chromium 145、4× CPU、40ms 延迟、10Mbps 下执行 20 个禁用缓存的首次打开样本和 10 个 `saveData` 降级样本；本机标准化结果为可交互 P75 790ms、降级 P75 1ms、点击后动态脚本 P75 243,229 bytes，分别通过 2.5s、300ms 与 320KB 预算，且所有样本都验证 R3F 未进入首屏。专项另覆盖桌面连续开关 20 次、移动 5 次、context lost 与 3D 态 axe 0 critical。P1 已新增纯函数 `@fangcun/carving-aid` 与服务端权威 `/api/carving-aid`：刻制稿移除印泥 / 残损表现并转为纯黑白，G17 断言正反稿复用同一几何 hash 且只施加 `scale(-1 1) translate(-1000 0)`；Studio 支持 15 / 18 / 20 / 25 / 30mm、`M` 反字稿、`R` 近似真实大小、正反永久标签、石料建议，导出的 1:1 SVG 含 10mm 校验标尺，反字 PNG 写入 300dpi `pHYs` 元数据。服务端矢量 1:1 PDF 复用同一份权威刻制稿：25mm 印面的单页尺寸为 76 × 59mm（MediaBox 215.433071 × 167.244094pt），包含正 / 反永久标签、10mm 标尺和几何 hash 响应头；Studio 已提供 PDF 下载与版本快照。M4 已交付版本化本地项目库与 `/projects` 项目中心，并新增可选 Supabase 账户同步：`/account` 使用真实邮箱注册 / 登录，登录后批量迁移完整项目版本与学习进度；同步使用上次指纹做三方比较，本机或云端单边更新自动合并，双端修改必须逐项目选择，断网编辑标记待同步、恢复在线后重试，退出账户仍保留本机项目。数据库迁移只向 `authenticated` 授予所需权限，`seal_projects` / `learning_progress` 开启 RLS 并以 `auth.uid()` 隔离；本地真实注册验证匿名写入被拒绝且两个账户互不可见。未配置 Supabase 时页面明确保持本地模式且不发送数据，Supabase 客户端只进入 `/account` 路由。A2 已在首页交付“字形 → 章法 → 刀感 → 印泥”滚动叙事；K3–K6 已发布 12 个 SSG 百科词条、标注与概念对比、服务端判题小测及五篇本地 MDX 课程；M6 已发布“应衢”“大府”“新成甲”三枚带完整来源限制的精选印。当前全仓 94 项单元 / Golden、125 项 E2E（另 7 项按设备条件跳过）与 43 页生产构建通过；账户同步另通过配置 / 未配置双模式桌面与移动专项测试。G17、P1 文件输出、M4（含登录同步）、M6、A2、A3 与 K3–K6 已交付；R4 仅待实物打印误差 ≤ 0.5mm。

R5 当前证据：新增纯函数 `@fangcun/ai-designer` 与服务端 `/api/ai/design`，将提示词解析为受 Zod 约束的 Intent，再由 Style Profile Resolver 映射并通过现有 DSL normalizer clamp，最终只交给 Seal Engine 生成 SVG。规则降级表覆盖 60 个时代、用途与气质关键词，66 个规则样本的有效 DSL 率为 100%；缺少印文会要求补充而不是猜字，公章 / 证照与一比一复刻请求在生成前拒绝，印文仍由服务端合规规则复检。在线路径使用 OpenAI Responses API Structured Outputs，仅让模型返回去除印文与解释字段的有界 Intent；印文取自本地规则基线，推荐理由由本地 Style Profile 生成，随后继续经过 Zod、Resolver clamp、合规复检和 Seal Engine。默认模型为 `gpt-5.6-luna`，服务端设置 6 秒超时、禁用响应存储、只缓存成功模型 Intent；超时、拒绝、Schema 异常或服务错误均自动回到规则推荐，未配置 `OPENAI_AI_DESIGNER_PROVIDER=openai` 与 `OPENAI_API_KEY` 时不向外部发送描述。24 小时内只缓存归一化 Intent，每次重新生成都会得到新 seed；`/ai` 展示四个权威候选、术语依据、完整参数 / resolve log、最近六轮恢复与显式 Studio 确认，并明确显示“在线模型 / 规则推荐”及隐私边界。K7 已发布八枚首批印记定义，当前以真实成功事件自动发放“初刻”“识朱白”“上石”；版本化本地状态记录事件去重键，重复生成、小测或导出不会重复授予。账户页提供朱文 / 灰线稿印记网格，获得反馈为按需加载 GSAP 的 300ms Toast 钤印动画并支持减少动效；账户同步对成就 code 做集合并集并保留最早获得时间，数据库以 `(user_id, achievement_code)` 主键、RLS 与 `merge_user_achievements` RPC 保证幂等和账户隔离，遥测只记录 code 与来源事件。provider 单元测试覆盖成功、一次 Schema 重试、未配置、拒绝、无效输出与超时；本地 mock Responses API 集成验证模型路径返回四个有效候选，断开 mock 后同一服务自动降级为规则路径。K7 的白名单 SQL 复核确认仅“初刻”“识朱白”“上石”可写，未来五枚 code 被忽略。当前全仓 lint、typecheck、172 项单元 / Golden、147 项完整 E2E（另 7 项条件跳过）、db lint 与 44 页生产构建通过。R5 本地交付完成；真实线上额度、延迟与采用率需在部署环境继续观测。

R6 当前证据：I1 已交付 `/en`、`/en/create`、`/en/studio`、`/en/seals`、`/en/seals/[slug]`、`/en/dictionary`、`/en/academy` 与 `/en/gallery` 的服务端 / 静态预渲染路由，并把 Studio、3D 查看器、生成 / 渲染 API 接入 `locale`。英文界面覆盖参数、ARIA、导出、刻制辅助、版本历史、3D 状态与解释面板；毫米尺寸保留并附英寸，中文界面保留 `18 mm`、`18 × 18 mm` 与中文版本标点兼容格式。新增英文历史印详情文案与 `i18n.spec.ts`，验证语言切换、元数据、核心流程、内容路由无混合语言 / 横向溢出、桌面 / 移动 axe 关键违规为 0，以及同一 DSL 的 explain facts、SVG path 几何完全一致，仅辅助文案不同。修复后的专项刻制 / 项目历史回归 10/10 通过；全量 Playwright 为 157 passed、7 skipped、0 failed；全仓 lint、typecheck、177 项单元 / Golden 与 54 页隔离生产构建通过。R6 的线上内容审核、Preview 部署和真实国际用户反馈仍属于发布后工作。

R7 当前证据：首批 FR-301–305 边款切片已接入 Studio 中英文流程。Seal DSL 新增最多四面的 `inscription.faces[]`，并自动兼容旧版单面 `side` / `text`；编辑器支持每面 32 字、楷 / 行 / 隶书体语义、单 / 双刀、年月 + 名款 + 地点模板、项目保存 / 恢复和独立版本差异。黑底白字拓片 SVG 带方位、书体与刀法标注；3D Adapter 从同一 DSL 派生侧面纹理和静态事实，方 / 长方印贴合四侧，圆印按正 / 右 / 背 / 左贴合四段 90° 圆柱 UV，椭圆印保留曲面近似警告。单刀使用确定性的 `0.012` 浅凹凸，双刀使用 `0.026` 深凹凸并加宽线口；静态海报态同步展示贴合方式与刀法差异，凹凸贴图不冒充真实字体轮廓挖刻。A4 FR-308 已把 `physical.material` 扩为青田、寿山、昌化、巴林、铜、玉、木、陶八种可选材质；Adapter 提供 PBR 参数，R3F 在用户打开后按需生成确定性纹理，材质热切换保留同一 Canvas、相机角度、印面 SVG 与导出几何。项目可保存 / 恢复材质并记录独立版本差异；非石材刻制建议明确转交专业加工。印面 / 侧面 / 印钮使用 scoped GSAP 标准视角转场，减少动效时直接到达目标位置。首批三件精选印已补齐结构化馆藏尺寸与材质：应衢 14×14×20mm 玉、大府 54×61×117mm 铜、新成甲 23×23×19mm 玉；中英文详情复用同一按需查看器，馆藏尺寸只覆盖 3D 展示比例，印面仍来自权威 Seal Engine SVG。羊钮、柱钮与鼻钮只映射为参数化近似并永久显示“非扫描 / 测绘 / 复原 / 鉴定模型”边界；没有结构化来源数据时不得展示历史 3D 入口。P3 已交付本地优先的多页印谱：`packages/album` 以 A4 / A5、册页 / 经折装 / 网格和 1 / 2 / 4 / 6 / 9 宫格计算毫米槽位，`/album` 与 `/en/album` 输出带 ARIA / 来源元数据的权威 SVG；PNG 与单页矢量 PDF 保持当前页范围，`/api/albums/export` 可把最多 24 个带 `data-fangcun-output="album-page"` 的权威 SVG 依序写入整册矢量 PDF。草稿本地优先，登录并完成同步后可把最多 24 页的不可变项目版本或受控历史教学参考另存为仅所有者可读的云端印谱；历史印不会成为项目。所有者还可明确创建或刷新一个只读、可撤销的多页分享链接：链接仅冻结实际已同步项目版本的 DSL 与版面，排除历史教学参考，公开查看页经最小字段 BFF 重新派生 SVG，绝不显示来源专辑 / 项目 / 账户或编辑、导出、社交入口。公开发布与历史印教学参考分享仍在后续范围。P2 已形成审核优先的公开作品与收藏闭环：项目详情提交不可变 DSL / Engine / Glyph / Remix 快照，`gallery_posts` 默认 `pending`，只有 `published` 行在 `/gallery` 与 `/en/gallery` 可读；策展示例与用户公开作品明确区分，未配置 Supabase 时不伪造发布状态。作者可见自己的审核状态和说明，并可为 `rejected` / `removed` 作品提交一次申诉。审核员必须通过服务端 `auth.getUser()` 核验的 `app_metadata.gallery_reviewer` 才能进入 `/review` 或 `/en/review`；服务端只可调用受限队列 / 状态 RPC，状态变化在同一事务记录为不可变事件，普通角色不能读取事件、直接审核或更新作品。作品、举报、申诉和公开作品分队列处理，接受申诉不会自动重发。公开作品可从对话框 Remix：新文字重建 Glyph，只继承视觉结构并写入不可移除的 `meta.remixOf`；登录用户可提交只对审核人员可见的四类举报。收藏使用 `gallery_posts.id` 引用而非复制 DSL：新合集默认私有，创建者可明确设为公开，`/collections/:id` 与 `/en/collections/:id` 始终从来源快照展示；新建合集与首次收藏在同一 RLS 事务完成，匿名无法读取私有合集或条目，待审作品不能加入合集。Gallery 以 `published_at DESC, id DESC` 局部索引稳定读取，每次先显示 12 枚审核作品、再以显式“加载更多”读取下一页；不使用无限下拉，末页自动收起入口。迁移通过本地重建、schema lint、安全 advisor、角色 RLS 探针和桌面 / 移动审核、合集、分页、作者资料 E2E：公开作者资料是显式的笔名和可选简介，邮箱与 Auth 元数据永不入表；匿名只可读公开资料与 `published` 作品，写入者只能操作自己的资料。`/creators/:id` 与 `/en/creators/:id` 不显示关注、私信、动态、排行或社交计数，作者关闭资料后作品不再链接笔名。真实字体轮廓的网格 / 布尔挖刻仍待后续。

R7 K5 / K6 更新（2026-08-15）：新增中英文 `/academy/map` 个人知识地图，静态节点来自 `@fangcun/knowledge/knowledge-map`，客户端只聚合既有课程进度与成就印记。六个 L0 节点显示“已掌握 / 学习中 / 待探索”，每个节点连接相关词条与下一步课程 / 小测；不新增 localStorage key、数据库表、错题或失败记录，英文视图复用同一证据。地图采用有序路径、原生链接、`<progress>`、Glyph 印记和移动端单列布局，已补纯函数空状态 / 开始 / 完成 / 掌握 / 未知值单测与桌面 / 移动中英文 E2E。

R7 P3 更新（2026-08-14）：本地印谱现已支持三枚具来源的历史印教学参考。中英文历史印详情用 `?historic=<slug>` 进入 `/album` / `/en/album`；左栏参考卡可在桌面拖入舞台，按钮提供键盘与移动端的等价入口。草稿只持久化校验过的 slug，输出使用同条目 Seal DSL 的教学复原，并带 `historic:<slug>` 与“历史印教学参考 · 机构”图注；它绝不写入项目库、成为可编辑项目或复制文物笔画。故此前段中“历史印拖入仍继续”的旧记录已被本更新取代；云端 `albums`、跨页编辑与分享仍在 R7 范围内。

本轮验证：新增历史印参考单元测试与桌面 / 移动 E2E 覆盖详情入口、拖放事件、按钮备用、英语路径、来源图注和“项目库未写入”；修复 `@fangcun/album` 槽位从毫米到 SVG 画布单位的换算，使印面与图注按实际尺寸可见。全仓 lint、typecheck、205 项单元 / Golden、全量 Playwright 192 passed / 16 skipped / 0 failed、60 页隔离生产构建与 Markdown / diff 检查均通过。

R7 P3 更新（2026-08-14）：已完成私有云端印谱的最小闭环。迁移 `20260814143227_cloud_albums.sql` 新增 `albums` / `album_items`：登录用户仅能读写自己的行，匿名角色没有表权限；条目必须是该用户已同步项目中的实际 `project_id` / `version_id`，或三枚受控历史教学 slug 之一。`save_album` 以 `SECURITY INVOKER` 在同一事务更新版面与条目，绝不接收 Seal DSL、文物图像、公开可见性或分享链接。中英文 `/album` 均可另存、更新、载入和删除账户私有印谱；缺少所引版本时明确要求先同步，而不会替换为当前版本。此更新取代此前“尚未接入云端 albums 表”的说明；跨页编辑和分享仍在 R7 范围内。

本轮验证：本地 `db reset`、schema lint、安全与性能 advisor 通过；新增云端印谱单元测试与真实 Supabase 桌面 / 移动 E2E，覆盖版本钉住、匿名拒绝、伪造历史 slug 拒绝及英文载入；全仓 lint、typecheck、208 项单元 / Golden、完整 Playwright（194 passed / 18 skipped / 0 failed）与 60 页隔离生产构建通过。

R7 P3 更新（2026-08-15）：私有云端印谱现已支持多页编辑。草稿升级为 `fangcun:album:draft:v2`，会把旧单页草稿迁移为第一页；每页独立固定项目版本与历史印教学参考，用户可键盘操作前后页、新增页、删除当前页，整册最多 24 页。迁移 `20260815000922_multi_page_cloud_albums.sql` 为 `albums` 增加 `page_count`，并让 `album_items`、RLS 和八参数 `save_album` RPC 同时校验页码、每页容量、每页来源唯一性与不可变版本归属；旧七参数单页 RPC 保持兼容。当前 PNG / 单页 PDF 只导出当前页；此后的私有可撤销分享链接与整册矢量 PDF 已完成。

本轮验证：新增多页序列化 / 回载单元测试和桌面 / 移动 E2E；真实本地 Supabase 覆盖两页保存、英文回载、匿名拒绝、伪造历史 slug、直接越界页和 RPC 越界页拒绝；本地 `db reset`、schema lint、安全 / 性能 advisor、全仓 lint、typecheck、210 项单元 / Golden、完整 Playwright（196 passed / 18 skipped / 0 failed）和 60 页隔离生产构建通过；Markdown 链接与 diff 检查通过。

R7 P3 更新（2026-08-15）：新增私有、可撤销的多页印谱分享。创建者必须显式确认；`create_album_share` 只接受已同步项目的实际固定版本，不接受历史印教学参考，并把题名、版面、页码、图注与 DSL 冻结到独立分享快照。每次创建 / 刷新都会替换随机令牌、使旧链接立即失效；撤销会删除快照并让 `/album/share/:token`、`/en/album/share/:token` 立即不可读。公开页不读取来源专辑或项目，只经 service-role BFF 取得校验后的最小字段，重新派生只读 SVG，不提供编辑、导出或社交传播；匿名无分享表权限，分享响应没有账户、专辑或项目 ID。公开发布与历史印教学参考分享仍为后续范围。

本轮验证：`20260815005856_private_album_share_links.sql` 通过本地 `db reset`、schema lint、安全 / 性能 advisor；分享专项以真实本地 Supabase 覆盖桌面 / 移动创建、分页、匿名表访问拒绝、撤销失效与历史参考阻断。全仓 lint、typecheck、210 项单元 / Golden、无云配置完整 Playwright（196 passed / 20 skipped / 0 failed）、60 页隔离生产构建及 Markdown 链接 / diff 检查通过。

R7 P3 更新（2026-08-15）：整册矢量 PDF 已交付。`@fangcun/album` 新增固定元数据的多页 PDF writer，单页 API 保持兼容；`/api/albums/export` 可接受 1–24 个已标记页面，单页上限 1.5MB、整册 8MB，并按输入顺序保留每页毫米 MediaBox。中英文印谱页新增“导出整册 PDF”：重新派生各页的 Seal Engine SVG、限制两页并发和相同 DSL 请求去重，输出不复用或修改 Seal DSL，历史教学参考仍只限私有本地 / 私有云端导出，绝不进入公开分享。

本轮验证：多页 PDF 单元测试验证页树、单页兼容与相同输入字节一致；桌面 / 移动印谱 E2E 真实下载两页 PDF、断言文件名、页数响应头、成功状态与无横向溢出。全仓 lint、typecheck、212 项单元 / Golden、无云配置完整 Playwright（196 passed / 20 skipped / 0 failed）、60 页隔离生产构建及 Markdown 链接 / diff 检查通过。

R7 A4 更新（2026-08-15）：3D 印面由同一权威 Seal Engine SVG 的 `data-char` Glyph 路径派生固定深度 `0.032` 的浅层轮廓网格；朱文显示为浅凸起，白文显示为浅凹入，动态解析失败时保留原 SVG 纹理。该网格仅用于按需 R3F 预览，不改变 DSL、印面 SVG 或 PNG / PDF / DXF / CNC 输出；真实高精度布尔挖刻、扫描复原和生产加工几何仍明确排除。边款继续使用楷 / 行 / 隶书体纹理。

本轮验证：`@fangcun/seal-3d` 单测 8 项、包级 typecheck、Web typecheck / lint，以及桌面 3D E2E 新增 Glyph 来源、凹刻模式、负向深度和最大深度边界断言通过。

R7 教育模式更新（2026-08-15）：FR-441 / FR-442 已接入五个中文 L0 课程。默认阅读页提供“投屏模式”和“打印讲义”；`?present=1` 隐藏主导航、课程路径、课后练习与前后课导航，放大标题、正文和互动图解，并支持 Esc 返回阅读模式。A4 portrait 打印样式隐藏屏幕控制，固定输出标题、正文、图注和每个互动组件的两枚权威 Seal Engine SVG 对照图。显示状态由局部客户端控制器读取查询参数，课程服务端页面不读取 `searchParams`，五个路由继续 SSG；这部分显示能力没有新增班级账户、学生数据或数据库表。

本轮验证：桌面 1440px 与 Pixel 5 全页截图确认无重叠或横向溢出；全仓 lint、typecheck、217 项单元 / Golden、完整 Playwright（208 passed / 20 skipped / 0 failed）、投屏态桌面 / 移动 axe 0 critical、62 页隔离生产构建及 Markdown / diff 检查通过。

R7 教育模式更新（2026-08-16）：FR-443 / FR-444 已交付中英文课堂模式。`@fangcun/knowledge` 提供名章、朱白文对照与读序三个稳定模板，未登录 / 未配置云端时仍可直接打开 Studio。登录账户可创建私有班级合集并分享 8 位邀请码；学生提交必须引用自己 `seal_projects` 中已同步的真实版本，RPC 冻结 DSL、Engine 与 Glyph Asset，并以 `(collection_id, student_id)` 保留一份可替换最终稿。教师读取全班、学生只读自己、匿名无表 / RPC 权限，提交列权限不暴露 `student_id`，页面只显示自填别名且不进入公开 Gallery。课堂关闭后界面与 RPC 同时拒绝提交。

专项验证：迁移通过本地 `db reset`、schema lint 及安全 / 性能 advisor；真实 Supabase 桌面与 Pixel 5 双账户流程 2 passed / 2 条件跳过，覆盖创建、同步提交、第二学生隔离、重交单行覆盖、伪造项目 / 版本拒绝、匿名拒绝、身份列拒绝和关闭后拒绝。无云中英文模板页通过 axe critical 0 与横向溢出检查；全仓 lint、typecheck、223 项单元 / Golden、完整 Playwright（212 passed / 22 skipped / 0 failed）、桌面 / 390px 私有课堂视觉走查及 64 页隔离生产构建通过。中文 / 英文课堂首页静态预渲染，两个邀请码详情保持按需动态私有路由。

## 4. 并行工作流

阶段可以并行，但同一条工作流内保持依赖顺序。每条工作流必须有一个 owner，owner 可以是个人，也可以是小组。

| 工作流 | 负责范围 | 主要产出 | 关键阻塞 |
|---|---|---|---|
| Engine | M0–M5、DSL、Glyph、Layout、Distress、SVG | 共享 TypeScript 包、Golden SVG、版本迁移 | Glyph 资产与几何规则未确定 |
| Web / Studio | 首页、Create、Studio、导出、路由、保存 | 可操作页面、状态机、键盘路径、端到端流程 | Engine 契约、Design Tokens |
| Knowledge / Content | K0–K7、字典、学院、印库、来源 | 术语 / 词条 / 课程 / 历史印数据、审核记录 | 来源授权、专家审校 |
| Motion | A1–A2、动效 Token、时间线、ScrollTrigger | GSAP 组件、减少动效分支、动效视觉回归 | DOM 结构稳定、性能预算 |
| 3D | A3–A5、`seal-3d`、材质、相机、降级 | R3F 查看器、SVG poster、标准视角、资源回收 | Seal DSL 几何、设备能力、包体预算 |
| Platform / QA | C1、CI、观测、部署、无障碍、性能 | 合规服务、Playwright、axe、Preview / Staging | 需求编号与错误码稳定 |

## 5. 发布门槛

| Gate | 对应版本 | 必须回答的问题 | 关键验收 |
|---|---|---|---|
| G0 架构门 | R1 → R2 | 数据、合规和渲染是否有单一事实来源？ | DSL / Schema 可迁移；C1 服务端权威；G01–G02；CI 可运行 |
| G1 MVP 门 | R3 → R4 | 第一次访问能否在 90 秒内完成一枚印？ | 5 人脚本 ≥ 4/5 完成；生成 P95 < 1.5s；PNG / SVG 一致；axe 0 critical |
| G2 V1 门 | R4 → R5 | 内容和 3D 是否增强体验而不拖慢工具？ | 3D P75 ≤ 2.5s；WebGL 失败 300ms 内降级；知识提示关闭后流程完整；反字稿误差 ≤ 0.5mm |
| G3 V2 门 | R7 → R8 | 平台能力是否可公开、可审核、可复用？ | 历史来源完整；公开内容有审核；边款 / 印谱 / 3D 不改几何事实；社区举报可闭环 |
| G4 V3 门 | R8 → 后续 | 真实盖印和 API 是否可控？ | 物理演示可停止 / 降级；API 版本化、限流、合规复检；老项目可按版本重建 |

## 6. 每个迭代的 Definition of Done

一个任务只有同时满足以下条件，才能从“开发中”变为“完成”：

- PRD、DESIGN、TECH 的编号和字段一致，变更已更新对应文档；
- TypeScript 类型检查、单元测试和相关 Golden / E2E 通过；
- 新 UI 有 Empty / Loading / Success / Error / Offline 状态；
- 动效有 `prefers-reduced-motion` 静态等价方案，GSAP / ScrollTrigger 在卸载时清理；
- 3D 有 SVG poster、WebGL 失败、context lost 和低性能降级；
- 键盘路径、alt、对比度和触控目标完成走查；
- 埋点事件、错误码和性能指标已登记；
- Preview 可复现，reviewer 已确认视觉回归基线。

## 7. 风险与止损动作

| 风险信号 | 触发条件 | 止损动作 |
|---|---|---|
| 3D 拖慢首屏 | 3D 进入首屏公共 chunk，或 `viewer_3d_ready_p75` > 4s | 关闭 `viewer3d.enabled`；只保留 SVG poster；不回退生成器功能 |
| 动效造成效率损失 | 输入时出现 tween 排队，或帧时间 > 20ms | 关闭滚动叙事，保留核心生成 / 盖印；改用 `overwrite: "auto"` / 静态状态 |
| 字形覆盖不足 | 高概率姓名字缺 Glyph 或 fallback 率异常 | 先扩充高频姓名字资产；缺字必须标记并可继续生成，不阻塞其他字 |
| 引擎输出漂移 | `rebuild_consistency` < 99.9% | 冻结新引擎发布，按 `engineVersion` 跑 Golden 差异报告 |
| 内容审核积压 | 来源 / 版权字段缺失，或历史表述无法确认 | 暂不公开该条内容；标记“传 / 暂定”，不影响编辑器可用 |
| 合规误伤上升 | `compliance_appeal_success_rate` > 20% | 将问题规则降为 warning，补 negative 用例，保留服务端复检 |

## 8. 路线图维护

| 频率 | 动作 | 负责人 |
|---|---|---|
| 每周 | 更新阶段状态、风险、Gate 证据链接 | 项目 owner |
| 每个迭代结束 | 把已完成项从“计划”改为“完成”，记录实际耗时与未完成原因 | 各工作流 owner |
| 每次版本发布 | 更新版本地图、验收结果、指标快照和回滚开关 | 产品 + QA + DevOps |
| 引擎 / 资产 / 内容变更 | 同步 `engineVersion`、`assetVersion`、`contentVersion` 与 Golden 报告 | Engine / Content owner |

状态约定：`计划`、`进行中`、`完成`、`阻塞`、`延后`。只有有证据的交付才能标记“完成”；`阻塞`必须写明下一步和解除条件。

## 9. 依据文档

- 产品范围与版本： [PRD §21 版本规划](docs/PRD.md#21-版本规划)
- 动效与 3D 设计： [DESIGN §19 动效与印章物理感](docs/DESIGN.md#19-动效与印章物理感)
- 技术里程碑： [TECH §30 开发里程碑](docs/TECH.md#30-开发里程碑)
- 性能、测试与发布： [TECH §24](docs/TECH.md#24-性能缓存与任务调度)、[TECH §27](docs/TECH.md#27-测试策略)、[TECH §29](docs/TECH.md#29-部署与-cicd)

---

**方寸之间，自有天地。**
