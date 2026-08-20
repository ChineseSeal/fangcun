# Work Log

简要记录每次对话完成的工作。按时间顺序追加，每次保留一到两条记录。

## 2026-08-08

- 生成 AGENTS.md 贡献指南，覆盖仓库结构、命令、编码风格、测试、PR 与安全约定；完成格式和链接校验。
- 新增对话工作日志规则，并初始化 WORKLOG.md。

## 2026-08-08 · R0 启动

- 建立 pnpm/Turborepo、Next.js 路由壳、Design Tokens、环境配置、Feature Flag、事件 schema 与 CI 骨架；新增首页交互及五个规划路由。
- 通过 lint、类型检查、4 项单测、生产构建和桌面 / 移动 Lighthouse 100 分审计；ROADMAP 标记 R0 进行中，Preview 部署待接入。

## 2026-08-08 · R1 验证

- 修复 DSL 迁移结果的类型收窄和 Seal Engine 的 ES2020 字符串转义兼容性；新增 G01 / G02 稳定 SVG Golden 测试，更新 ROADMAP 与 README 的 R1 状态。
- 通过全量 lint、typecheck、21 项测试（含 2 项 Golden）、生产构建；本地验证合规拦截、Seal SVG 生成、首页输入生成交互与桌面 Lighthouse 100 分。

## 2026-08-08 · R2 启动

- 新增候选生成器、结构化 `ExplainFacts` / `annotations[]`、`/api/seals/explain`，并把 `/create` 从路由壳升级为可输入、可选朱白文、可切换三候选的真实流程。
- 通过全量 lint、typecheck、26 项测试、生产构建；浏览器验证桌面 / 移动 `/create`、API 响应和候选切换，移动 Lighthouse 四项 100 分。

## 2026-08-09 · R2 Golden 扩展

- 新增三类脚本种子 Glyph、G03–G10/G16 Golden 行为覆盖、确定性残损遮罩、圆印 / 粗边 / 界格 / 不等格、锁定字形重排和 `/api/seals/relayout`；修复简化生成请求丢失 style / mode / script 的参数问题。
- 通过全量 lint、typecheck、31 项测试；更新 R2 验收证据，Preview 部署仍未接入。

## 2026-08-09 · R2 验收闭环

- 首页改用 Seal Engine 实时 SVG，新增 100 次字节级确定性与候选生成 P95 测试；补齐 Playwright 桌面 / 移动输入、风格切换和视口检查，并接入 CI。
- 通过 lint、typecheck、33 项单元 / Golden 测试、4 项 E2E 与生产构建；本地候选生成 P95 0.283ms，ROADMAP 将 R2 标记完成，R0 Preview 部署仍待接入。

## 2026-08-09 · R3 Studio 启动

- 新增 `/studio`、权威 render / SVG export API、50 步 Undo / Redo、本地草稿、离线保留、参考网格及印式 / 形状 / 密度 / 边框 / 残损 / seed 调整；`/create` 候选可直接进入 Studio。
- 通过 lint、typecheck、35 项单元 / Golden 测试、8 项桌面 / 移动 E2E、生产构建与截图走查；ROADMAP 标记 R3 进行中，PNG、单字 Variant、知识内容及 G1 用户任务待完成。

## 2026-08-09 · 原型 UI 重构

- 按 `docs/UI/` 七张原型重构首页、生成器、Studio、AI、印库、字典、学院和社区，新增宣纸山水 / 印谱资源，并沉淀 Design Tokens、公共页头页脚、图标与印面组件及 Web Design System 文档。
- 保留 Seal Engine 生成 / 编辑 / 导出闭环，完成桌面与移动截图走查；通过 lint、typecheck、35 项单元 / Golden 测试、10 项 E2E、17 路由生产构建和 Markdown / diff 检查。

## 2026-08-09 · R3 MVP 能力补齐

- Studio 新增按需 Variant 查询、单字切换 / 来源 / 锁定及 Undo / Redo，支持从权威 SVG 派生 1000px 纸色 PNG 与透明 PNG；统一术语库补齐拼音、最长匹配和键盘可操作浮层。
- 上线 L0 前 3 课静态课程页与创作练习；通过 lint、typecheck、40 项单元 / Golden 测试、12 项桌面 / 移动 E2E、21 页生产构建与截图走查，R3 仍待首次盖印时间线、axe 与 G1 用户任务。

## 2026-08-09 · R3 动效与 G1 自动验收

- 新增可复用 scoped GSAP 首枚盖印时间线，接入首次生成、重新生成与主动重播，并提供无位移 / 缩放的减少动效分支；补充 axe、动效、G1 90 秒任务和空 JSON API 回归测试。
- 通过 Markdown / diff、lint、typecheck、40 项单元 / Golden、28 项桌面 / 移动 E2E、21 页构建及应用内浏览器走查；axe 0 critical，G1 自动任务桌面 5.4s、移动 4.1s，5 人真实用户验收仍待执行。

## 2026-08-09 · R3 学院进度与五人验收准备

- 新增版本化本地学习进度、课程开始 / 完成 / 实践事件、学院进度总览、继续学习与刷新恢复；补充 G1 五人无引导测试脚本和匿名空白记录表。
- 通过应用内浏览器桌面 / 390px 走查、核心五路由 axe、46 项单元 / Golden、32 项桌面 / 移动 E2E 与 21 页构建；Playwright 使用独立端口和构建目录避免并行 Next 进程冲突，R3 仅待真实 5 人验收。

## 2026-08-09 · R4 A3 轻量 3D 启动

- 新增纯 Seal DSL 派生的 `@fangcun/seal-3d` 与 Studio 按需 R3F 石章查看器，支持拖动 / 缩放、三个标准视角、SVG 海报、静态事实、`saveData` / WebGL / context lost 降级和资源卸载。
- 通过应用内浏览器生产模式走查、51 项单元 / Golden、40 项桌面 / 移动 E2E 与 21 页构建；本机单次 3D 就绪 819ms、动态 chunk 237.5KB gzip、控制台无告警，R4 继续受真实 G1 门槛约束。

## 2026-08-09 · R4 P1 刻制辅助启动

- 新增纯函数 `@fangcun/carving-aid`、权威 `/api/carving-aid` 与 Studio 正 / 反稿视图，支持 mm 预设、近似 1:1、G17 整体镜像、石料建议、含 10mm 标尺的真实尺寸 SVG 和带 300dpi 元数据的反字 PNG。
- 修复旋转按钮遮挡舞台模式切换；通过应用内浏览器桌面走查、移动截图、55 项单元 / Golden、44 项桌面 / 移动 E2E 与 22 页构建，实物打印误差和 PDF 仍待后续验收。

## 2026-08-09 · 字体现状诊断

- 核对字体资源、全局 Token 与原型规范：当前未接入 WOFF2、`@font-face` 或 `next/font`，页面仅依赖宋体、楷体和黑体的系统回退栈，无法保证字形、字重与排版尺寸一致。
- 确认 UI 字体偏差与印面种子 Glyph 的占位几何是两类问题；本轮仅完成诊断和记录，未修改页面实现。

## 2026-08-09 · 自托管字体系统

- 接入 Fontsource 5.3.0 的思源宋体、思源黑体与等宽可变字体 WOFF2 分片，统一 Design Tokens、品牌英文、字典 / 印库标题与静态印面组件，并让 Studio 参数字体按路由加载。
- 新增字体实际命中与同源请求 E2E；通过 lint、typecheck、55 项单元 / Golden、48 项桌面 / 移动 E2E、22 页生产构建及桌面 / 移动截图走查。

## 2026-08-10 · 生成式篆刻图标系统

- 使用 gpt-image-2 统一生成 18 枚中国古风篆刻刀痕图标，完成键控背景移除、256px RGBA 资产化，并以 CSS mask 接入现有 `Icon` API，保留尺寸、`currentColor` 与无障碍语义。
- 新增图标资产与渲染 E2E；通过透明度 / 完整性检查、lint、typecheck、55 项单元 / Golden、图标专项桌面 / 移动 4 项 E2E 和 22 页生产构建；完整 E2E 复跑 46 / 52 通过，6 项受并发字形导入后的冷启动时序与 Variant 数量变更影响，图标相关用例均通过。

## 2026-08-10 · 印章字形资产重建

- 从带固定版本、哈希和授权记录的 CNS11643《说文解字》、JFZSKSealScript V3 与 OpenCC 重建 Glyph `2026.08.1`：发布 10,180 个独立 SVG Variant、覆盖 8,925 个输入字符，新增质量报告、简繁来源字、多字形 Variant、现代篆化标记与 Unicode 懒加载分片。
- 全站印面移除 SVG `<text>` 和系统字体占位，接入权威引擎路径与可缓存 Sprite；字典不再伪造未收录历史书体。通过 lint、typecheck、57 项单元 / Golden、56 项桌面 / 移动 E2E 和 22 页构建；首页 117KB，生产生成冷 / 热请求 40ms / 14ms。

## 2026-08-10 · 全书体字形覆盖

- 发布 Glyph `2026.08.2`，在 10,180 个可追溯基础 Variant 上为甲骨文、金文、缺字古玺、汉印篆和鸟虫篆增加确定性按需扩展，使五类书体均覆盖现有 8,925 个输入字符；扩展字形独立哈希并明确标记为现代生成，不冒充逐字文物摹本。
- 字典与 Studio 已展示 / 选择六类真实 SVG 路径并保留现代篆化警告；通过 lint、typecheck、58 项单元 / Golden、58 项桌面 / 移动 E2E、22 页构建及桌面 / 移动截图走查，首页 117KB，生产甲骨文四字生成冷 / 热请求 41ms / 7ms。

## 2026-08-10 · 原型对照审美审查

- 对照 `docs/UI/` 七张原型完成首页、创建、Studio、AI、印库、字典、雅集及四个 390px 移动页面的只读审查，输出桌面并排对照、移动总览与分优先级改进建议。
- 本轮未修改产品实现；确认 Studio / 创建移动端信息架构、来源标签密度、字符图标残留和小字号 / 小热区是下一轮审美优化重点。

## 2026-08-10 · R4 M4 本地项目与版本

- 新增版本化本地项目库、旧草稿迁移、30 秒 / 离页自动保存、关键操作与导出快照、不可变历史恢复；Studio 桌面 / 移动接入真实版本时间线，`/projects` 支持预览、继续编辑、重命名、复制和归档。
- 通过视觉走查、Markdown / diff、lint、typecheck、63 项单元 / Golden、64 项桌面 / 移动 E2E 与 23 页生产构建；首次开发编译使用独立端口和 10 秒断言窗口，生产性能门槛不变。

## 2026-08-11 · 原型审查问题闭环

- 对照 `docs/UI/` 修复审查问题：全站复用既有 gpt-image-2 篆刻图标并移除字符图标，重构创建 / Studio 移动端为结果与印面优先的底部参数抽屉，精简 AI 主次方案，统一印库 / 字典 / 印谱的来源说明、层级、字号、热区、悬停与窄屏操作区，并补上移动浏览器中文本自动放大防护。
- 新增移动信息架构与抽屉回归覆盖，更新 Studio 相关 E2E；通过 lint、typecheck、63 项单元 / Golden、65 项桌面 / 移动 E2E（1 项桌面条件跳过）、23 页生产构建及 7 个核心路由的 390px / 桌面应用内浏览器走查，核心路由横向溢出均为 0。

## 2026-08-11 · 生成式图标语义补充

- 使用 gpt-image-2 补充生成 21 枚中国古风篆刻图标，完成透明化与 256px RGBA 归一，整套扩展至 39 枚；为撤销 / 重做、保存 / 复制、项目、锁定、旋转、缩放、归档 / 恢复、播放等真实入口接入专属图形，消除 `refresh`、`bookmark`、`grid`、`book` 的多义复用。
- 更新图标资产清单、全量预览及桌面 / 移动语义 E2E；通过 39 枚透明度 / 尺寸 / 完整性检查、diff、lint、typecheck、63 项单元 / Golden、67 项桌面 / 移动 E2E（1 项桌面条件跳过）与 23 页生产构建。

## 2026-08-11 · R4 A2 首页滚动叙事

- 首页新增“字形 → 章法 → 刀感 → 印泥”GSAP / ScrollTrigger 叙事组件，支持步骤跳转、跳过、回看与匿名事件；移动端及减少动效模式改为无 pin 的完整静态卡片，最终印蜕复用 Seal Engine SVG。
- 更新 Feature Flag、事件契约、Glyph 与叙事 E2E；通过视觉走查、diff、lint、typecheck、64 项单元 / Golden、71 项 E2E（另 3 项按设备条件跳过）与 23 页生产构建，ROADMAP 标记 A2 已交付。

## 2026-08-11 · R4 P1 1:1 PDF

- 刻制辅助新增服务端矢量 1:1 PDF，复用权威正 / 反稿几何，提供永久标签、10mm 标尺、精确毫米页面、几何 hash 响应头、Studio 下载入口与版本快照；25mm 印面的单页为 76 × 59mm。
- 通过 `pdfinfo` 尺寸核验、300dpi 渲染走查、lint、typecheck、65 项单元 / Golden、71 项 E2E（另 3 项按设备条件跳过）与 23 页生产构建；实物打印误差 ≤ 0.5mm 仍待真实设备验收。

## 2026-08-11 · R4 M4 项目详情与版本对比

- 将 `/projects/[id]` 从 Studio 重定向升级为项目详情：新增共享并去重的权威印面预览、可命名版本时间线、导出快照列表、左右版本选择，以及从完整 DSL / Engine / Glyph Asset 派生的结构化差异；历史恢复仍只追加新版本。
- 通过桌面 / 390px 全页视觉走查、axe 0 critical、无横向溢出、lint、typecheck、70 项单元 / Golden、73 项 E2E（另 3 项按设备条件跳过）与 23 页生产构建；M4 本地版本对比交付，登录后同步仍待后续接入。

## 2026-08-11 · R4 K3 印章小百科

- 新增 12 个带核验来源的核心词条、`/academy/wiki` 索引与 SSG 详情页，接入 `DefinedTerm` / `DefinedTermSet`、误区纠正、关联学习、匿名浏览事件及两组可切换的权威 Seal DSL SVG 图例；学院入口与已发布术语浮层已直达百科。
- 24 组图例全部通过合规与渲染 API；完成桌面 / 390px 视觉走查、lint、typecheck、74 项单元 / Golden、83 项 E2E（另 3 项按设备条件跳过）、36 页生产构建及百科路由 axe 0 critical，ROADMAP 标记 K3 已交付。

## 2026-08-11 · R4 K4 标注与概念对比

- Seal Engine 新增印文、留白、重心 / 疏密与同 seed 残损标注路径并修正传统二字横读排位；新增有故宫出处的“应衢”玉印 SSG 详情、逐项可聚焦标注层和同文同尺寸朱白文键盘对比，明确教学复原不是文物原图。
- 完成桌面 / 390px 视觉、无 JS 与减少动效降级走查；通过 lint、typecheck、79 项单元 / Golden、92 项 E2E（另 4 项按设备条件跳过）、37 页生产构建及精选印详情 axe 0 critical，ROADMAP 标记 K4 已交付。

## 2026-08-11 · R4 K5 识印入门小测

- 新增五题 SSG 识印小测、确定性 Engine 题图、服务端隔离题库与逐题判题 API；答后即时给出非挫败式解析，结果可分享、重做并回链薄弱词条 / 课程，学院和最后一课已接入入口。
- 首屏 HTML 不含答案或解析；通过 lint、typecheck、83 项单元 / Golden、104 项 E2E（另 4 项按设备条件跳过）、38 页生产构建及小测桌面 / 移动 axe 0 critical，ROADMAP 标记 K5 已交付。

## 2026-08-12 · R4 K6 五课 MDX 学院

- 将入门轨扩展为朱白、章法、刀意与残损、读序、印泥五篇本地 MDX 课程；新增一句结论、术语浮层、核验来源、课后练习、带参 Studio 入口及 10 组服务端 Engine 互动 SVG，并保留无 JavaScript 双图降级。
- 修复 Next dev 并发写入 Playwright manifest 的测试竞争；通过 lint、typecheck、85 项单元 / Golden、111 项 E2E（另 5 项按设备条件跳过）与 40 页生产构建，ROADMAP 标记 K6 已交付。

## 2026-08-12 · R4 M6 精选印库基础

- 依据故宫公开著录发布“应衢”“大府”“新成甲”三枚精选印，补齐来源、藏品号、许可与使用限制；服务端并行生成无缺字 SVG，新增时代 / 书体筛选、SSG 详情和不复制原印文的 Style Profile → Studio 路径。
- 修复候选主方案覆盖显式章法的问题；通过桌面 / 移动视觉走查、lint、typecheck、87 项单元 / Golden、123 项 E2E（另 5 项按设备条件跳过）与 42 页生产构建，ROADMAP 标记 M6 已交付。

## 2026-08-12 · R4 A3 正式 3D P75

- 新增 `pnpm benchmark:3d`：隔离生产构建，以 4× CPU、40ms 延迟、10Mbps 对 20 个冷缓存首次打开和 10 个 `saveData` 降级样本进行 P75 与动态包体预算检查，并验证 R3F 不进入首屏。
- Chromium 145 标准化样本通过：可交互 P75 790ms、降级 P75 1ms、点击后动态脚本 P75 243,229 bytes；通过 lint、typecheck、87 项单元 / Golden、8 项 3D 专项 E2E、42 页构建和生产浏览器走查，R4 仅余登录同步与实物打印设备验收。

## 2026-08-12 · R4 M4 登录后同步

- 新增可选 Supabase 账户页、登录后项目 / 学习进度迁移、离线待同步、三方指纹比较与逐项目冲突选择；未配置云端时保持不传输数据的本地模式，退出后仍保留本机项目。
- 建立带 RLS 与最小权限的数据库迁移并通过真实双账户隔离；将 Next E2E 固定为隔离目录单 writer，通过 lint、typecheck、94 项单元 / Golden、125 项 E2E（另 7 项条件跳过）、账户配置双模式桌面 / 移动专项、43 页构建和应用内浏览器走查，R4 仅余实物打印误差验收。

## 2026-08-12 · R5 M7 规则智能生成底座

- 新增 Prompt → Intent → DSL 纯函数包、60 关键词规则降级、解释过滤、24 小时 Intent 缓存和服务端安全 / 合规闭环；重构 `/ai` 为四候选、参数记录、最近六轮恢复与显式 Studio 确认的真实工作流。
- 通过 lint、typecheck、161 项单元 / Golden、135 项完整 E2E（另 7 项条件跳过）、28 项 `/ai` axe 专项、44 页生产构建和桌面 / 移动视觉走查；在线模型 provider 与 K7 成就仍待后续。

## 2026-08-12 · R5 K7 成就系统

- 新增八枚版本化印记定义与幂等本地事件库，接入首次生成、入门小测 4 / 5 与刻制辅助导出；账户页增加真实篆字朱文 / 灰线稿网格，获得反馈使用按需加载 GSAP 的 300ms Toast 钤印动画，并补齐五个成就预览字形路径。
- 成就云同步采用 code 集合并集和最早获得时间，新增 Supabase 主键、RLS 与安全 RPC；通过浏览器桌面 / 移动走查、db reset / lint、双账户隔离、168 项单元 / Golden、145 项完整 E2E（另 7 项条件跳过）、真实 Supabase 10 项 E2E（另 2 项条件跳过）及 44 页生产构建。

## 2026-08-12 · R5 M7 在线模型 Provider

- 接入 OpenAI Responses API Structured Outputs，仅解析有界 Intent；印文、文化解释、DSL、合规与 SVG 保持本地权威，超时 / 拒绝 / 无效输出自动回到规则推荐并明确隐私边界。
- 完成 K7 code 白名单复核与全量回归；通过 lint、typecheck、172 项单元 / Golden、147 项 E2E（另 7 项条件跳过）、db lint、mock provider 成功 / 降级集成及 44 页生产构建。

## 2026-08-13 · R6 I1 国际化收口

- 修复中文 Studio 尺寸、成品尺寸和版本历史的旧测试兼容格式，同时保留英文英制辅助；清理 Next 生产 / Playwright 自动写入的临时 tsconfig 类型目录，并为 i18n 格式补充单测。
- 完成 R6 验收记录：专项刻制 / 项目历史 10/10、全量 Playwright 157 passed / 7 skipped、lint、typecheck、177 项单元 / Golden 与 54 页隔离生产构建通过；更新 ROADMAP / README，R6 标记完成，保留 Preview、内容审核和真实国际用户反馈为发布后工作。

## 2026-08-13 · R7 多面边款启动

- 新增兼容旧项目的四面边款 DSL、Studio 中英文编辑器、年月名款地点模板、拓片 SVG、边款版本差异与 R3F 侧面纹理；同步修正文档中的真实数据契约和圆印近似边界。
- 通过 lint、typecheck、182 项单元 / Golden、163 项 E2E（另 7 项条件跳过）与 54 页隔离生产构建；R7 标记进行中，真实轮廓挖刻、圆柱 UV、材质切换及其余平台能力继续推进。

## 2026-08-13 · 当前架构盘点

- 核对 pnpm / Turborepo、Next.js App Router / BFF、九个领域包、Seal DSL → Glyph → Engine 权威渲染链路、本地项目库与 Supabase 可选同步，整理当前实现架构及规划差异。
- 本轮未修改产品实现，仅追加 `WORKLOG.md`；完成 Markdown 链接与 diff 格式检查，并记录 Studio 编排热点、API 契约差异、未提交工作树和隔离构建目录占用等后续治理点。

## 2026-08-13 · R7 A4 3D 材质与视角

- 扩展青田、寿山、昌化、巴林、铜、玉、木、陶八种材质，接入 Studio 中英文切换、确定性 PBR 纹理、项目版本、专业加工提醒与保留 Canvas / SVG 几何的 R3F 热更新；标准视角改为 scoped GSAP 转场并提供减少动效静态等价。
- 通过 lint、typecheck、187 项单元 / Golden、166 项 E2E（另 8 项条件跳过）与 54 页隔离生产构建；3D 基准为可交互 P75 804ms、降级 1ms、动态脚本 244,469 bytes，均在预算内。

## 2026-08-13 · R7 A4 历史印 3D

- 为“应衢”“大府”“新成甲”补齐馆藏毫米尺寸与玉 / 铜材质的结构化模型数据，中英文详情复用按需 R3F 查看器；来源尺寸只覆盖 3D 比例，钮式明确为参数化近似，并永久声明非文物扫描、测绘、复原或鉴定模型。
- 通过桌面 / 移动生产页面视觉走查、lint、typecheck、190 项单元 / Golden、170 项 E2E（另 8 项条件跳过）与 54 页隔离生产构建；最新 3D 基准为可交互 P75 813ms、降级 1ms、动态脚本 244,470 bytes，全部在预算内。

## 2026-08-14 · R7 A4 曲面边款与刀法凹凸

- 3D Adapter 新增平面 / 圆柱曲面贴合与确定性凹凸契约；圆印四面边款分别映射 90° 圆柱 UV，单刀为 0.012 浅凹凸、双刀为 0.026 深凹凸并加宽线口，静态事实同步说明，真实字体轮廓布尔挖刻仍明确排除。
- 完成桌面生产页视觉走查、桌面 / 移动曲面专项与全量回归；通过 lint、typecheck、191 项单元 / Golden、172 项 E2E（另 8 项条件跳过）和 54 页隔离生产构建，3D 基准为可交互 P75 810ms、降级 1ms、动态脚本 244,827 bytes，全部在预算内。

## 2026-08-14 · R7 P3 本地印谱基础

- 新增 `@fangcun/album` 纯函数版面契约、A4 / A5 与册页 / 经折装 / 网格 SVG 页面生成、浏览器 PNG 派生和服务端矢量 PDF；`/album`、`/en/album` 从本地项目当前版本排版，草稿只写入本地存储，不改变 Seal DSL 几何。
- 修复印谱 SVG 与设置控件重复 `id` 的无障碍问题；通过印谱桌面 / 移动中英文专项 4/4、全量 Playwright 176 passed / 8 skipped、lint、typecheck、193 项单元 / Golden、57 页隔离生产构建及 Markdown / diff 检查。

## 2026-08-14 · 路线图状态核对

- 复核 ROADMAP、TECH 与工作日志：R0 Preview、R3 真实 G1、R4 实物打印，以及 R7 / R8 的平台化、真实盖印和开放能力仍未完成；本轮未修改产品代码。

## 2026-08-14 · R7 P2 Gallery 审核与 Remix 底座

- 新增不可变 `gallery_posts` / 私有 `gallery_reports` RLS 迁移、项目详情提交入口、中英文审核公开作品区与 Remix：新印文重建 Glyph，只继承视觉结构并固定 `meta.remixOf` 来源；未配置 Supabase 时仅展示明确标记的策展示例。
- 通过 lint、typecheck、195 项单元 / Golden、190 项 Playwright（182 passed / 8 条件跳过）、本地 `db reset` / `db lint`、匿名 / 作者 RLS 探针和 57 页隔离生产构建；审核后台、申诉、收藏 / 合集与云端印谱仍待后续 R7。

## 2026-08-14 · R7 P2 审核闭环

- 新增中英文审核工作台、作者审核状态与一次性申诉；服务端以 `auth.getUser()` 核验 `app_metadata.gallery_reviewer`，通过仅 service-role 可执行的队列 / 状态 RPC 原子更新状态并追加不可变事件，普通角色没有审核 RPC、审计或直接表读取权限。
- 通过本地数据库重建、lint、安全 advisor、角色 RLS 探针、审核专项桌面 / 移动 E2E、198 项单元 / Golden、194 项完整 Playwright（184 passed / 10 条件跳过）、lint、typecheck 和 60 页隔离生产构建；收藏 / 合集、作者主页与云端印谱仍待后续 R7。

## 2026-08-14 · R7 P2 私人收藏与公开合集

- 新增中英文收藏对话框与 `/collections/:id` 详情页；合集只引用审核通过的 `gallery_posts` 快照，新建合集与首次收藏通过同一 RLS 事务完成，默认私有，只有创建者明确选择后才公开，未加入点赞、关注或排行。
- 通过迁移重建与数据库 lint / advisor、200 项单元 / Golden、已配置收藏专项桌面 / 移动 2 passed（2 项未配置条件跳过）、默认全量 Playwright 186 passed / 12 条件跳过、lint、typecheck 和 60 页隔离生产构建；作者主页、分页加载、历史印拖入、跨页编辑和云端 albums 仍待 R7。

## 2026-08-14 · R7 P2 Gallery 明确分页

- Gallery 已改为每页 12 枚审核作品加一条探针，并按 `published_at DESC, id DESC` 稳定排序；只有点击“加载更多”才请求下一页，末页收起入口，明确不使用无限下拉。
- 新增分页局部索引和桌面 / 移动真实 Supabase 回归（13 枚作品首屏只见 12、下一页才显示剩余作品）；通过数据库重建、lint / advisor、201 项单元 / Golden、默认 Playwright 186 passed / 14 条件跳过、lint、typecheck 与 60 页隔离生产构建。作者主页、历史印拖入、跨页编辑和云端 albums 仍待 R7。

## 2026-08-14 · R7 P2 公开作者主页

- 新增中英文 `/creators/:id`：账户用户可主动维护公开笔名和简介，页面只展示该作者审核通过的作品及明确分页；资料关闭后作品不再链接笔名。资料与 Auth 邮箱、元数据和权限判断完全分离，不提供关注、私信、动态、排行或社交计数。
- 新增 `gallery_creator_profiles` RLS 与作者作品分页局部索引；通过本地重建、db lint / security / performance advisor、203 项单元 / Golden、作者资料真实 Supabase 桌面 / 移动 2 passed（2 项条件跳过）、默认全量 Playwright 188 passed / 16 条件跳过、lint、typecheck 和 60 页隔离生产构建。历史印拖入、跨页编辑、云端 albums 和真实字体轮廓挖刻仍待 R7。

## 2026-08-14 · R7 P3 历史印教学参考

- 历史印详情可进入中英文印谱；左栏提供拖放与按钮备用入口，草稿只保存校验 slug，导出图注常驻来源，且绝不创建可编辑项目或复制文物笔画；同步修复印谱毫米槽位到 SVG 画布单位的换算。
- 通过 lint、typecheck、205 项单元 / Golden、历史印印谱专项与全量 E2E（192 passed / 16 skipped）、60 页隔离生产构建、Markdown 链接及 diff 检查；完成桌面与移动截图走查。

## 2026-08-14 · R7 P3 私有云端印谱

- 新增 `albums` / `album_items` RLS 迁移和原子 `save_album`；中英文印谱可私有另存、更新、载入与删除，只保存已同步项目的不可变版本引用或受控历史 slug，绝不上传 Seal DSL、文物图像或公开分享状态。
- 通过本地 db reset、lint、安全 / 性能 advisor、208 项单元 / Golden、真实 Supabase 桌面 / 移动专项、完整 E2E（194 passed / 18 skipped）、lint、typecheck、60 页隔离构建、Markdown 链接与 diff 检查；清理构建生成的临时 TypeScript include。

## 2026-08-15 · R7 P3 多页私有印谱

- 将本地和云端印谱扩展为最多 24 页：`draft:v2` 自动迁移旧单页草稿，逐页固定项目版本 / 历史参考，支持键盘翻页、新增和删除；当前页可导出 PNG / PDF，整册共享与合并 PDF 保持未开放。
- 新增多页 `page_count` 迁移、页码 / 容量 / 来源唯一性 RLS 与新版原子 RPC；通过 db reset、lint、security / performance advisor、210 项单元 / Golden、真实 Supabase 桌面 / 移动专项、全量 E2E（196 passed / 18 skipped）、lint、typecheck、60 页隔离构建、Markdown 链接与 diff 检查，并清理构建临时 TypeScript include。

## 2026-08-15 · R7 P3 可撤销私有印谱分享

- 新增独立冻结分享快照、仅所有者可调用的创建 / 刷新 / 撤销 RPC，以及中英文最小字段 BFF 与只读分页查看页；分享只允许已同步项目的固定版本，禁止历史教学参考、来源身份、编辑和导出。
- 通过本地 db reset、lint、安全 / 性能 advisor、真实 Supabase 桌面 / 移动分享专项、210 项单元 / Golden、完整 E2E（196 passed / 20 skipped）、lint、typecheck、60 页隔离构建、Markdown 链接和 diff 检查；清理所有 Next 临时 TypeScript include。

## 2026-08-15 · R7 P3 整册矢量 PDF

- 新增确定性多页 PDF writer 和受限 1–24 页导出 API；中英文印谱可导出整册，按当前页序重新派生 Seal Engine SVG，限两页并发并去重相同 DSL，保留各页毫米尺寸与打印边界。
- 通过 PDF 页树 / 字节确定性单测、印谱桌面与移动下载 E2E、212 项单元 / Golden、完整 E2E（196 passed / 20 skipped）、lint、typecheck、60 页隔离构建、Markdown 链接和 diff 检查；清理本轮 Next 临时 TypeScript include。

## 2026-08-15 · R7 A4 Glyph 印面轮廓网格

- 3D 查看器从权威 Seal Engine SVG 的 `data-char` Glyph 路径派生浅层印面网格：朱文浅凸起、白文浅凹入，固定深度且失败时保留原 SVG 纹理；不回写 DSL 或进入生产导出。
- 视觉走查发现并修复 SVG / Three.js Y 轴错位与深度方向；通过 213 项单元 / Golden、lint、typecheck、桌面 3D 6/6、移动 3D / 边款 9 passed / 1 skipped、60 路由生产构建，以及 3D 基准 P75 947ms、252,431 bytes、降级 1ms。

## 2026-08-15 · R7 K8 个人知识地图

- 新增 `@fangcun/knowledge` 知识地图纯函数与中英文 `/academy/map`，聚合现有课程进度和成就印记，显示“已掌握 / 学习中 / 待探索”，不新增 localStorage key、数据库表、错题或失败记录；学院首页增加入口。
- 收窄学院旧 `.page article` 样式选择器并补充中英文 axe 路由覆盖；通过 217 项单元 / Golden、lint、typecheck、完整 Playwright 202 passed / 20 skipped、知识地图专项 6 passed、axe / i18n 专项 40 passed、62 页隔离生产构建及 Markdown / diff 检查。

## 2026-08-15 · R7 教育模式讲义与投屏

- 五个中文 L0 课程新增 A4 打印讲义和 `?present=1` 无干扰投屏：隐藏导航 / 练习 / 前后课入口，放大正文与权威互动 SVG，支持 Esc 返回；课程继续 SSG，未新增班级账户、学生数据或数据库表。
- 通过桌面 / Pixel 5 视觉走查、lint、typecheck、217 项单元 / Golden、完整 Playwright 208 passed / 20 skipped、投屏态 axe 0 critical、62 页隔离生产构建及 Markdown / diff 检查；清理本轮 Next 临时类型目录。

## 2026-08-16 · 方寸品牌视觉提案提示词

- 基于 `README.md`、`docs/PRD.md`、`docs/DESIGN.md`、Design Tokens 与现有原型，整理可直接用于图片生成的方寸品牌输入：东方现代主义、宣纸 / 墨 / 朱砂色系、白文方印标识、数字篆刻产品链路与真实目标人群。
- 本轮未修改产品实现；完成品牌生成规则核对、工作树状态检查，并准备执行 Markdown / diff 格式校验。

## 2026-08-16 · R7 教育模式课堂合集与模板

- 交付 FR-443 / FR-444：新增三个中英文课堂练习模板、私有课堂合集与冻结提交数据库契约、中英文课堂首页 / 邀请码详情、教师与学生视图，并保持课堂与公开 Gallery、邮箱及 Auth 元数据隔离。
- 通过数据库重建、lint、安全 / 性能 advisor、223 项单元 / Golden、真实 Supabase 桌面 / Pixel 5 专项、完整 Playwright（212 passed / 22 skipped）、lint、typecheck、桌面 / 390px 视觉走查与 64 页隔离生产构建；恢复 Next 自动类型路径并完成 Markdown / diff 检查。

## 2026-08-16 · R0 Vercel Preview

- 创建 `fruitsai/fangcun` Vercel 项目并配置 `apps/web` 根目录、Next.js、Node 22、pnpm 10.30.3 与受保护 Preview；新增 `/api/system/health`、统一 `ENGINE_VERSION`、Vercel 配置、Preview Smoke 与 PR 预览工作流，明确 Preview 规则模式不需要任何服务端 secret。
- 本地 lint、typecheck、unit、build 与 Preview Smoke 通过；真实 Preview `https://fangcun-7d4cw07ta-fruitsai.vercel.app` READY，健康接口返回 staging / `0.1.0` / `0.1.0` / `2026.08.2`，受保护 Preview 的桌面 / 移动 Smoke 2/2 通过。完整代码尚未提交到远程 Git，GitHub Actions 的 Vercel secrets 待配置，R0 保持待基线提交 / CI Secrets。

## 2026-08-16 · R0 交付复核

- 重新通过 `pnpm lint`、`pnpm typecheck`、`pnpm test`（11 个 workspace、78 项 Web 单测）与 `pnpm build`（64 页）；本地 Preview Smoke 桌面 / 移动 2/2 通过，`git diff --check` 与 Markdown 链接扫描通过。
- 确认 `codex/r0-preview` 尚未推送，远程仍只有初始 `README.md`；最新 Vercel Preview 保持 READY 且 SSO 保护开启。剩余工作仅为建立 Git 基线、配置四个 GitHub Actions Secrets 并验证 PR workflow，未获得提交 / 推送授权前不执行这些外部变更。

## 2026-08-20 · R0 Git 基线推送

- 修正 Python `__pycache__` 忽略规则与提交空白后，创建 `feat: establish Fangcun R0 application baseline`，提交 `8a01d4d`，包含 577 个基线文件；推送前重新通过 lint、typecheck、unit 和生产 build。
- 通过 SSH 将 `codex/r0-preview` 推送到 `github.com/ChineseSeal/fangcun`，远程分支 SHA 与本地一致；GitHub Actions Secrets 尚未配置，PR 尚未创建，Vercel 仍保持 Preview-only。

## 2026-08-20 · R0 路线图同步

- 将 ROADMAP 的 R0 状态从“待基线提交 / CI Secrets”更新为“待 CI Secrets / PR workflow”，记录完整基线已推送、当前提交与剩余外部配置边界。
