import { expect, test } from "@playwright/test";

test("creates explainable candidates and hands off only after confirmation", async ({ page }) => {
  await page.goto("/ai");
  await page.getByRole("button", { name: "做一个适合博客 Logo 的“天眼”现代印章" }).click();
  await expect(page.getByRole("textbox", { name: "描述你想要的气质、用途或时代感" })).toHaveValue(/天眼/);
  await page.getByRole("button", { name: "发送设计需求" }).click();

  await expect(page.getByRole("heading", { name: "为“天眼”整理的方案" })).toBeVisible();
  await expect(page.getByText("规则推荐", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^选择/ })).toHaveCount(4);
  await page.getByRole("button", { name: "选择章法变化" }).click();
  await page.getByText("查看完整参数与解析记录").click();
  await expect(page.getByText("Seed", { exact: true })).toBeVisible();

  const apply = page.getByRole("link", { name: "确认并进入工作台" });
  await expect(apply).toHaveAttribute("href", /text=%E5%A4%A9%E7%9C%BC/);
  await expect(page).toHaveURL(/\/ai$/);
  await apply.click();
  await expect(page).toHaveURL(/\/studio\?text=/);
  await expect(page.getByText("参考网格", { exact: true })).toBeVisible();
  const scriptSelect = page.getByRole("combobox", { name: "篆书书体" });
  if (!(await scriptSelect.isVisible())) {
    await page.getByRole("button", { name: /参数与字形/ }).click();
  }
  await expect(scriptSelect).toHaveValue("guxi");
  await expect(page.getByRole("spinbutton", { name: "印蜕 seed" })).not.toHaveValue("0");
});

test("asks for an inscription instead of inventing one", async ({ page }) => {
  await page.goto("/ai");
  await page.getByRole("textbox", { name: "描述你想要的气质、用途或时代感" }).fill("给书法作品设计一枚姓名章");
  await page.getByRole("button", { name: "发送设计需求" }).click();
  const error = page.getByRole("alert").filter({ hasText: "还不知道印章上要刻什么字" });
  await expect(error).toContainText("还不知道印章上要刻什么字");
  await expect(error).toContainText("例如“听雨”");
});

test("explains the configured provider privacy boundary", async ({ page }) => {
  await page.goto("/ai");
  await expect(page.getByText(/当前使用本地规则推荐|在线模型会接收本轮描述与印文/)).toBeVisible();
  await expect(page.getByText("规则或模型只负责理解需求；印面始终由 Seal DSL 与 Seal Engine 生成。")).toBeVisible();
});
