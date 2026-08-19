import { expect, test } from "@playwright/test";

type StoryEvent = { name: string };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const storyWindow = window as typeof window & { __fangcunStoryEvents: StoryEvent[] };
    storyWindow.__fangcunStoryEvents = [];
    window.addEventListener("fangcun:event", (event) => {
      const detail = (event as CustomEvent<StoryEvent>).detail;
      if (detail.name.startsWith("motion_story_")) {
        storyWindow.__fangcunStoryEvents.push(detail);
      }
    });
  });
});

test("supports the four-stage desktop narrative, skip, and replay", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes("mobile"), "Desktop scroll behavior only");
  await page.goto("/");

  const story = page.getByTestId("seal-making-story");
  await expect(story).toHaveAttribute("data-story-mode", "scroll");
  await expect(story.locator("[data-story-card]")).toHaveCount(4);

  await story.getByRole("button", { name: /章法/ }).click();
  await expect(story).toHaveAttribute("data-story-active-step", "1");

  await story.getByRole("button", { name: /印泥/ }).click();
  await expect(story).toHaveAttribute("data-story-active-step", "3");
  await expect.poll(async () => page.evaluate(() => {
    const storyWindow = window as typeof window & { __fangcunStoryEvents: StoryEvent[] };
    return storyWindow.__fangcunStoryEvents.map((event) => event.name);
  })).toContain("motion_story_completed");

  await story.getByRole("button", { name: /跳过演示/ }).click();
  await expect.poll(async () => page.evaluate(() => {
    const storyWindow = window as typeof window & { __fangcunStoryEvents: StoryEvent[] };
    return storyWindow.__fangcunStoryEvents.map((event) => event.name);
  })).toContain("motion_story_skipped");

  await story.getByRole("button", { name: /回看演示/ }).click();
  await expect(story).toHaveAttribute("data-story-active-step", "0");

  await page.goto("/academy");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
});

test("keeps all steps static without pinning on mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile fallback only");
  await page.goto("/");

  const story = page.getByTestId("seal-making-story");
  await expect(story).toHaveAttribute("data-story-mode", "static-mobile");
  await expect(story.locator("[data-story-card]")).toHaveCount(4);
  for (const card of await story.locator("[data-story-card]").all()) {
    await expect(card).toBeVisible();
  }
  await expect(story.locator(".pin-spacer")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test("shows a complete static equivalent when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const story = page.getByTestId("seal-making-story");
  await expect(story).toHaveAttribute("data-story-mode", "static-reduced");
  await expect(story.locator("[data-story-card]")).toHaveCount(4);
  for (const card of await story.locator("[data-story-card]").all()) {
    await expect(card).toBeVisible();
  }
  await expect(story.locator(".pin-spacer")).toHaveCount(0);
  await expect(story.locator("[data-story-layer]").last()).toBeVisible();
});
