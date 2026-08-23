import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openStudioControls } from "./studio-helpers";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL
  && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

test("explains local-only privacy when account sync is not configured", async ({ page }) => {
  test.skip(configured, "Supabase is configured for the integration flow");
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "账户与同步" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "当前为本地模式" })).toBeVisible();
  await expect(page.getByText("密钥缺失时不会发送任何项目数据。", { exact: false })).toBeVisible();
  await expect(page.getByLabel("邮箱")).toHaveCount(0);
});

test("migrates local projects after sign-up and preserves them after sign-out", async ({ page }, testInfo) => {
  test.skip(!configured, "requires the isolated local Supabase service");
  await page.goto("/create?text=%E6%96%B9%E5%AF%B8");
  await expect(page.locator('[role="status"][data-achievement-code="chu_ke"]')).toContainText("初刻");
  await page.getByRole("link", { name: "进入专业编辑器" }).click();
  await expect(page).toHaveURL(/\/studio\?/);
  await expect(page.locator(".studio-preview svg")).toBeVisible();
  await openStudioControls(page);
  await page.getByRole("button", { name: "保存项目" }).click();

  await page.goto("/account");
  await page.getByRole("button", { name: "注册", exact: true }).click();
  const email = `account-sync-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("Fangcun-Sync-2026!");
  await page.getByRole("button", { name: "注册账户" }).click();

  await expect(page.getByText("已把 1 枚本机印章同步到你的账户。")).toBeVisible();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();
  await expect(page.getByText("云端现有 1 个项目，已完成 0 课，获得 1 枚印记。")).toBeVisible();
  await expect(page.locator('[data-achievement-code="chu_ke"]')).toHaveAttribute("data-earned", "true");

  await page.reload();
  await expect(page.getByRole("heading", { name: email })).toBeVisible();
  await expect(page.getByText("本机项目、云端项目、学习进度与印记已同步。")).toBeVisible();
  await expect(page.locator('[data-achievement-code="chu_ke"]')).toHaveAttribute("data-earned", "true");
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page.getByText("已退出账户，项目继续保留在当前浏览器。")).toBeVisible();
  await expect(page.getByRole("heading", { name: "方寸印" })).toHaveCount(0);

  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "方寸印" })).toBeVisible();
  await expect(page.getByText("1 / 5 个本地项目")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  const critical = (await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze()).violations.filter((violation) => violation.impact === "critical");
  expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
});
