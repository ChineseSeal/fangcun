# 方寸 Fangcun

> **方寸之间，自有天地。**

中国传统印章设计与数字篆刻平台 —— 让任何人都能够**设计、理解和拥有**一枚真正的中国印章。

---

## 产品是什么

方寸不是"把字变红加个框"的印章生成器，而是三件事的结合：

| | |
|---|---|
| **一套设计引擎** | 章法、字形、印式、印蜕都是可编辑的矢量语义，相同参数永远生成同一枚印章 |
| **一个文化数据库** | 篆书字形、历史印章、历史风格都带来源与授权，可追溯、可学习 |
| **一条知识普及路径** | 让用户在做完一枚印章后，至少多懂一点印章——知识贴附在对象旁边，从不挡路 |

---

## 文档

核心文档职责分离，通过交叉引用保持一致。PRD、DESIGN 与 TECH 定义产品和实现边界，ROADMAP 只负责开发顺序、依赖和发布门槛。

| 文档 | 回答什么 | 阅读对象 |
|---|---|---|
| **[产品需求文档 PRD.md](docs/PRD.md)** | 做什么功能、优先级、验收标准 | 产品 / 设计 / 前端 / 后端 / 算法 / 内容 / 运营 |
| **[设计文档 DESIGN.md](docs/DESIGN.md)** | 长什么样、怎么操作、什么状态 | 设计 / 前端 / 产品 / 内容 |
| **[技术文档 TECH.md](docs/TECH.md)** | 用什么算法、什么数据结构、什么接口 | 前端 / 后端 / 算法 / 数据 / DevOps |
| **[开发路线图 ROADMAP.md](ROADMAP.md)** | 先做什么、依赖是什么、何时可以发布 | 产品 / 项目 / 技术负责人 / QA |
| **[Web Design System](docs/DESIGN_SYSTEM.md)** | 原型视觉如何落到 Token、组件和响应式页面 | 设计 / 前端 / QA |
| **[贡献指南 AGENTS.md](AGENTS.md)** | 如何开发、测试、提交和维护仓库 | 贡献者 / 代理 |
| **[工作日志 WORKLOG.md](WORKLOG.md)** | 每次对话完成的精简记录 | 项目协作者 |

### 各文档速览

**[PRD.md](docs/PRD.md)** · V2.0 · 25 章

产品定位、用户画像、七大模块、印章设计能力体系、**动画体验与 3D 印章**、**印章知识普及体系**、AI 篆刻师、印库、字典、社区、导出、合规、商业模式、版本规划、指标体系。功能需求以 `FR-xxx` 编号，带优先级（P0/P1/P2）与版本归属。

**[DESIGN.md](docs/DESIGN.md)** · V2.0 · 26 章

设计原则、视觉系统（全量 Design Token）、响应式栅格、逐页界面规范、**GSAP 动效系统**、**React Three Fiber 3D 体验**、**印章知识普及界面体系**、32 个组件详规、状态与异常、无障碍、文案与语气规范、Figma 交付规范。设计需求以 `D-xxx` 编号。

**[TECH.md](docs/TECH.md)** · V2.0 · 31 章

架构原则、Seal DSL、Seal Engine 九段管线、章法评分算法、字形变形、印蜕多尺度生成、SVG 导出、**GSAP / ScrollTrigger 动效架构**、**three.js / React Three Fiber 3D 渲染架构**、AI 参数化架构、Style Profile、知识内容系统、合规检查器、测试策略、可观测性、CI/CD、里程碑。附录含完整表结构、算法伪代码、DSL 约束表、错误码表、术语库种子数据。

**[ROADMAP.md](ROADMAP.md)** · 开发计划

以 `T0` 为项目启动周、两周为一个迭代，串起 M0–M7、K0–K7、C1、P1–P3、A1–A5、I1；包含阶段交付、依赖关系、发布 Gate、Definition of Done、风险止损和维护节奏。

### 动画与 3D 技术路线

| 能力 | 选型 | 首批落地 |
|---|---|---|
| React / SVG 动画 | `gsap` + `@gsap/react` | 首屏入场、逐字篆化、盖印时间线、卡片与页面转场 |
| 滚动叙事 | GSAP `ScrollTrigger` | “一枚印如何诞生”分层演示、历史时间轴与知识图解 |
| 3D 印章 | `three` + `@react-three/fiber` + `@react-three/drei` | 可旋转印章预览、材质切换、印面 / 侧面 / 印钮查看 |
| 降级 | SVG 静态海报 + 无位移动效 | WebGL 不可用、低性能设备、`prefers-reduced-motion` |

实施节奏：MVP 完成核心 GSAP 动效；V1 上线按需加载的轻量 3D 预览；V2 增加材质、边款与多视角；V3 再做真实盖印和雕刻物理仿真。

### R0 本地启动

```bash
pnpm install
pnpm dev --filter @fangcun/web
```

R0 的 Vercel Preview、环境边界、CI Secrets 与受保护 Preview Smoke 见
[`docs/R0-VERCEL.md`](docs/R0-VERCEL.md)。本地 Preview Smoke 可直接运行
`pnpm test:e2e:preview`；针对远程部署时需在 shell 中提供
`PLAYWRIGHT_BASE_URL` 与 Vercel automation bypass secret。

当前已按 `docs/UI/` 原型重构首页、生成器、Studio、AI 篆刻师、印库、字典、学院与社区页面，并建立可复用的 Web Design System。首页保留 Seal Engine 实时 SVG 预览，`/create` 提供候选生成，`/studio` 已支持单字 Variant、锁定、PNG / 透明 PNG / SVG 导出、术语浮层及按需 R3F 石章查看器；学院已提供 5 篇本地 MDX 入门课、10 组 Engine 互动图、本地学习进度、`/academy/wiki` 印章小百科、`/academy/quiz/intro` 五题识印小测，以及中英文 `/academy/map` 个人知识地图。知识地图只聚合课程状态与已获印记，显示已掌握 / 学习中 / 待探索，不保存错题或失败记录。R1 的 Seal Engine、Glyph 质检、服务端合规 API 与 GSAP 动效基础已可在本地运行；R2 已完成 `explain` / `annotations[]`、锁定字形重排、Golden / 确定性 / Playwright 验收；R3 已完成首次盖印时间线、axe 审计与自动化 G1 代表任务，仍待按 [G1 五人可用性测试](docs/G1-USABILITY-TEST.md) 完成真实参与者验收。R4 已交付 A2 首页滚动叙事、A3 轻量 3D、P1 刻制文件输出、M4 本地项目及登录同步、M6 精选印库基础与 K3–K6 知识内容；R5 已交付 OpenAI Structured Outputs provider、确定性规则降级与 K7 成就；R6 I1 已交付完整英文路由、核心流程英文文案、英制辅助及中英文事实一致性 E2E。R7 已启动：多面边款支持四侧款识、楷 / 行 / 隶书体语义、单 / 双刀、年月名款地点模板、黑底白字拓片 SVG、版本恢复与 3D 侧面纹理；A4 已接入青田 / 寿山 / 昌化 / 巴林 / 铜 / 玉 / 木 / 陶八种材质、确定性纹理、GSAP 标准视角、方印平面贴合、圆印四段曲面 UV，以及单刀浅 / 双刀深的轻量凹凸贴图，并让“应衢”“大府”“新成甲”依据馆藏著录尺寸与材质加载中英文 3D 教学模型。P3 已新增 `/album` 与 `/en/album` 多页印谱排版台：读取本地项目版本与三枚具来源标注的历史印教学参考，支持逐页独立选择、键盘可访问的新增 / 删除 / 上下页操作，以及册页 / 经折装 / 网格、A4 / A5、1 / 2 / 4 / 6 / 9 宫格；PNG 与单页矢量 PDF 从当前页权威 SVG 派生，整册矢量 PDF 会按固定顺序重新派生最多 24 页，打印时均需选择 100% / 实际大小。历史印只以当前 Seal DSL 教学复原进入版面，绝不创建可编辑项目或复制文物笔画。登录并先同步项目后，最多 24 页可另存、更新、载入和删除为仅该账户可读的云端印谱；云端只记录页数、版面、项目 / 不可变版本引用及受控历史 slug，不上传 Seal DSL、文物图片或公开内容。所有者可明确创建 `/album/share/<随机令牌>`（英文等价路由）的只读、可撤销分享链接：链接创建时仅冻结已同步项目的固定 Seal DSL 快照，不暴露来源专辑、项目列表或账户身份；历史印教学参考不会进入分享，更新云端印谱后必须手动刷新链接。公开页面经服务端最小查询读取并重新派生权威 SVG，不提供导出，也不改变 Seal DSL 几何。P2 已形成可审核闭环：项目详情提交固定 DSL / Engine / Glyph / Remix 来源的 `pending` 快照，只有审核通过的行会出现在中英文作品区；策展示例与用户公开作品明确分层，未配置 Supabase 时不伪造发布状态。作者能查看自己作品的状态和说明、为驳回或下架结果提交一次申诉；审核员经服务端 `auth.getUser()` 核验后在 `/review`、`/en/review` 处理作品、举报与申诉，每次状态变化都会留下不可变审计事件。Remix 会使用新印文重建 Glyph，只继承视觉结构并保留不可移除来源；登录用户可提交只对审核人员可见的举报。私人收藏与公开合集已上线：只引用审核通过的来源快照，默认私有，只有创建者明确选择后才公开；中英文详情不显示点赞、关注或排行。Gallery 每页先展示 12 枚审核作品，只有点击“加载更多”才读取下一页，末页没有入口或无限下拉。作者可在账户页主动创建笔名与简介，`/creators/:id` 和 `/en/creators/:id` 只展示其审核通过的作品，绝不派生或展示邮箱、关注、私信、动态或排行。历史模型明确标记为参数化近似，不冒充文物扫描；边款凹凸也不冒充字体轮廓的布尔挖刻。`pnpm benchmark:3d` 已验证轻量 3D 性能预算；R4 仅余实物打印误差校验，R7 的教育模式与真实字体轮廓挖刻继续推进。

R7 A4 最新边界：印面已经使用权威 Seal Engine SVG 的 `data-char` Glyph 路径生成浅层预览网格，朱文浅凸、白文浅凹；它不进入 DSL 或生产导出。高精度实体布尔挖刻仍属于后续范围。

R7 教育模式已交付 FR-441–FR-444：五个中文 L0 课程保留 SSG，并提供 A4 讲义与 `?present=1` 无干扰投屏；中英文 `/academy/classroom` 提供三个无需账户即可打开 Studio 的课堂模板。配置 Supabase 并登录后，课堂拥有者可创建私有班级合集、分享 8 位邀请码、关闭 / 重开课堂并查看学生冻结印面；学生只能提交自己已同步的项目版本且每课堂保留一份可替换最终稿。RLS 与最小列权限保证教师可看全班、学生只看自己、匿名无权访问，页面不显示邮箱、Auth 元数据或公开 Gallery 状态。真实字体轮廓挖刻仍属于后续范围。

### 可选账户同步

复制 `.env.example` 中的 Supabase URL 与 publishable key 到 `.env.local`，再执行 `pnpm supabase:start`、`pnpm db:reset` 与 `pnpm db:lint` 验证本地数据库。审核台和分享印谱 BFF 额外需要仅服务端可见的 `SUPABASE_SERVICE_ROLE_KEY`；前端不得使用或记录 secret / service-role key。`seal_projects`、`learning_progress`、私有 `gallery_collections`、印谱分享快照与 `classroom_*` 表均由 RLS 和最小列权限隔离；课堂提交 RPC 只从调用者自己的已同步项目版本冻结快照。

### 交叉引用约定

- PRD 引用 `TECH.md §7`（Glyph 资产）与 `TECH.md §20`（术语库数据结构），**这两个章节号不得变更**；
- 界面上出现的参数名必须与 TECH.md 的 Seal DSL 字段一一对应；
- Design Token 命名必须与 TECH.md 的前端实现一一对应。

---

## 核心概念速查

| 术语 | 一句话 |
|---|---|
| **朱文** | 印文凸起，钤出后字为红色、底为白色 |
| **白文** | 印文凹陷，钤出后字为白色、底为红色，汉代最常见 |
| **章法** | 印面上文字的排列与疏密安排 |
| **印蜕** | 印章钤在纸上留下的痕迹 |
| **边款** | 刻在印章侧面的文字，记录作者、时间或诗句 |
| **Seal DSL** | 描述一枚印章的版本化 JSON，是产品的单一事实来源 |
| **Style Profile** | 历史风格的参数化配置，不是"复制某一枚印" |

完整术语库见 [TECH.md 附录 F](docs/TECH.md)，界面呈现方式见 [DESIGN.md 第 15 章](docs/DESIGN.md)。

---

## 目录结构

```
fangcun/
├── apps/
│   └── web/             Next.js 路由壳
├── packages/
│   ├── carving-aid/     真实尺寸、反字稿与 PNG DPI 元数据
│   ├── album/           印谱版面计算、SVG 页面与 PDF 封装
│   ├── seal-engine/     确定性 SVG 引擎
│   ├── seal-3d/         Seal DSL 派生 3D 模型
│   └── design-tokens/   CSS Design Tokens
├── .github/workflows/   CI 骨架
├── AGENTS.md            贡献指南
├── WORKLOG.md           对话工作日志
├── ROADMAP.md           开发路线图
├── docs/
│   ├── PRD.md          产品需求文档 V2.0
│   ├── DESIGN.md       设计文档 V2.0
│   ├── DESIGN_SYSTEM.md Web Design System 实现规范
│   ├── UI/              页面原型图
│   └── TECH.md         技术文档 V2.0
├── package.json         pnpm workspace 命令
└── README.md
```

---

## 文档维护约定

| 约定 | 说明 |
|---|---|
| 只增不减 | 版本迭代**只做结构重组与内容增补**，不删除既有功能点与规范 |
| 编号稳定 | `FR-xxx` / `D-xxx` 编号一经分配不再复用 |
| 章节锚定 | 被其他文档引用的章节号不得变更（见"交叉引用约定"） |
| 变更映射 | 每次大版本在附录提供上一版内容映射表，便于核对无遗漏 |
| 文化可信 | 历史表述须有出处；存疑内容标 `传` / `一说`；不使用"复刻""最正宗"等表述 |

---

**方寸之间，自有天地。**
