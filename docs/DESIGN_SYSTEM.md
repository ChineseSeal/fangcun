# 方寸 Web Design System

本规范把 `docs/UI/` 的七张原型图落实为可复用的页面语言。原型图是视觉基准；业务数据、Seal DSL 与服务端生成结果仍是功能事实来源。

## 1. 实现分层

| 层级 | 位置 | 职责 |
|---|---|---|
| Design Tokens | `packages/design-tokens/src/tokens.css` | 纸色、墨色、朱砂色、字体、间距、圆角、阴影、动效时长 |
| 全局基础样式 | `apps/web/app/globals.css` | 页面背景、容器、按钮、表单、面板与无障碍基础 |
| 公共组件 | `apps/web/components/design-system/` | 品牌、导航、页脚、图标、静态印面展示 |
| 3D 渐进增强 | `packages/seal-3d/`、`apps/web/components/seal-3d/` | DSL 派生模型、R3F 查看器、SVG 海报与 WebGL 降级 |
| 页面模块 | `apps/web/app/*/*.module.css` | 只处理页面独有布局，不重复定义基础视觉变量 |

## 2. 视觉规则

- 页面最大宽度为 `1360px`，使用 `--page-gutter` 保持响应式边距。
- 背景使用宣纸与淡墨山水；内容面板使用半透明米白、细棕边和低强度阴影。
- 主操作使用 `--color-cinnabar`，正文使用 `--color-ink`，辅助信息使用 `--color-brown`。
- 标题及印文化文本使用 `--font-kai`；长正文使用 `--font-serif`；控件使用 `--font-sans`。
- `Noto Serif SC Variable` 与 `Noto Sans SC Variable` 通过 Fontsource WOFF2 分片自托管；`--font-kai` 是兼容旧页面的标题字体别名，禁止再直接写系统楷体或 `Georgia`。
- Studio 的参数值使用按路由加载的 `Noto Sans Mono Variable` 与 `.technical-value`，数字默认启用等宽排版。
- 桌面页头高度为 `92px`。`820px` 以下收敛导航和多栏布局，`600px` 以下优先保证双列卡片与触控区域。

## 3. 公共组件

- `SiteHeader` / `SiteFooter`：所有公共页面必须复用，禁止复制导航结构。
- `BrandMark`：统一方寸标识及中英文字标。
- `Icon`：统一线性图标尺寸与描边，不直接嵌入散落 SVG。
- `SealImpression`：用于内容卡片和原型占位；真实生成、编辑及导出必须使用 Seal Engine SVG。
- `MotionReveal`：GSAP 入场动画，必须保留 `prefers-reduced-motion` 静态分支。
- `TermPopover` / `TermRichText`：由 `@fangcun/knowledge` 统一术语库驱动；桌面悬停或点击展开，移动端行内展开，支持 Esc 关闭。
- `Seal3dViewer`：只在用户主动打开后动态加载 R3F，复用同尺寸 SVG 海报，标准视角与材质 / 尺寸 / 边款信息必须保留静态等价表达；边款事实还需注明平面 / 曲面贴合及单 / 双刀凹凸深浅。

## 4. 资源与维护

`apps/web/public/images/` 中的 `xuan-landscape.webp`、`seal-catalog.webp`、`han-seal-tile.webp` 于 2026-08-09 使用生成式图像工具为本项目创建，无外部素材依赖。新增资源应优先使用 WebP，写明来源、日期和使用限制，并提供合适的 `alt`。

字体资源来自 Fontsource 5.3.0，字体本体采用 SIL Open Font License 1.1；浏览器只请求同源的 `_next/static/media/*.woff2`，不得改用第三方字体 CDN。

新增组件前先检查公共层；同一种视觉模式在三个页面出现时，应提升为 Design System 组件。视觉改动需同时检查桌面、移动端、减少动效和无 WebGL 降级路径。
