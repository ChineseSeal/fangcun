import type { Page } from "@playwright/test";

export async function openStudioControls(page: Page) {
  const toggle = page.getByRole("button", { name: /参数与字形|Parameters and glyphs/ });
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
      await toggle.click();
    }
  }
}
