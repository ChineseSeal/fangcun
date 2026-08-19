import { expect, test } from "@playwright/test";

const routes = [
  ["/", "方寸之间，自有天地。"],
  ["/create", "为「清风明月」生成的方案"],
  ["/studio?text=%E6%96%B9%E5%AF%B8&style=han_private&mode=yin&seed=42&candidate=0", "参考网格"],
  ["/projects", "我的项目"],
  ["/ai", "AI 篆刻师"],
  ["/seals", "印库"],
  ["/seals/ying-qu", "章法分析图解层"],
  ["/seals/da-fu-xi", "楚国铜柱钮“大府”鉨"],
  ["/seals/xin-cheng-jia", "白玉鼻钮“新成甲”印"],
  ["/dictionary", "字形演变"],
  ["/academy", "从一枚印开始"],
  ["/academy/lesson/zhu-bai", "识印：朱文与白文"],
  ["/academy/lesson/reading-order", "读序：为什么从右往左"],
  ["/academy/lesson/yinni", "钤印：印泥为什么是红的"],
  ["/academy/quiz/intro", "识印入门"],
  ["/gallery", "用户印谱"],
] as const;

test("renders every prototype route without horizontal overflow", async ({ page }) => {
  for (const [route, landmark] of routes) {
    await page.goto(route);
    await expect(page.getByText(landmark, { exact: false }).first()).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflows, `${route} should fit inside the viewport`).toBe(false);
  }
});
