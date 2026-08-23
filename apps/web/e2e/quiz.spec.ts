import { expect, test } from "@playwright/test";

test("keeps answers server-side and gives an immediate neutral explanation", async ({ page }) => {
  await page.goto("/academy/quiz/intro");
  await expect(page.getByTestId("quiz-runner")).toBeVisible();
  await expect(page.getByText("第 1 / 5 题")).toBeVisible();

  const initialHtml = await page.content();
  expect(initialHtml).not.toContain("answerId");
  expect(initialHtml).not.toContain("correctOptionId");
  expect(initialHtml).not.toContain("字为纸色、底部着印泥色");

  await page.getByText("朱文", { exact: true }).last().click();
  await page.getByRole("button", { name: "确认答案" }).click();

  const feedback = page.locator("[role='status'][data-correct='false']");
  await expect(feedback).toContainText("再看一眼");
  await expect(feedback).toContainText("所以是白文");
  await expect(feedback).toContainText("正确选项：白文");
  await expect(feedback).toHaveCSS("color", "rgb(62, 90, 107)");
});

test("completes all five questions and links weak areas without recording failure", async ({ page }) => {
  await page.goto("/academy/quiz/intro");

  const answers = ["朱文", "朱文", "从右向左", "界格", "方整紧密，四字趋向平满"];
  for (let index = 0; index < answers.length; index += 1) {
    await page.getByText(answers[index], { exact: true }).last().click();
    await page.getByRole("button", { name: "确认答案" }).click();
    await expect(page.locator("[role='status']")).toBeVisible();
    await page.getByRole("button", { name: index === answers.length - 1 ? "查看结果" : "下一题" }).click();
  }

  await expect(page.getByRole("heading", { name: "五题已读完，留下自己的观察。" })).toBeVisible();
  await expect(page.getByText("4", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "白文", exact: true })).toHaveAttribute("href", "/academy/wiki/baiwen");
  await expect(page.getByRole("link", { name: /识印：朱文与白文/ })).toHaveAttribute("href", "/academy/lesson/zhu-bai");
  await expect(page.getByRole("button", { name: /重新练习/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("fangcun.quiz"))).toBeNull();
});

test("supports native keyboard radio selection", async ({ page }) => {
  await page.goto("/academy/quiz/intro");
  const firstOption = page.getByRole("radio", { name: "朱文" });
  await firstOption.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "白文" })).toBeChecked();
  await page.getByRole("button", { name: "确认答案" }).click();
  await expect(page.locator("[role='status'][data-correct='true']")).toContainText("看懂了");
});
