import { expect, test } from "@playwright/test";

const iconNames = [
  "add",
  "archive",
  "arrow",
  "bookmark",
  "book",
  "check",
  "chevron",
  "copy",
  "download",
  "edit",
  "feather",
  "filter",
  "fullscreen",
  "grid",
  "heart",
  "history",
  "image",
  "list",
  "lock",
  "play",
  "project",
  "redo",
  "refresh",
  "restore",
  "rotate",
  "save",
  "search",
  "send",
  "shuffle",
  "sliders",
  "sort",
  "stamp",
  "star",
  "undo",
  "unlock",
  "user",
  "volume",
  "zoom-in",
  "zoom-out",
] as const;

test("serves the complete generated seal icon set", async ({ request }) => {
  for (const iconName of iconNames) {
    const response = await request.get(`/icons/seal/${iconName}.png`);

    expect(response.ok(), `${iconName} should load`).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(1_000);
  }
});

test("renders generated icons as current-color decorative masks", async ({ page }) => {
  await page.goto("/");

  const icon = page.locator('[data-icon="feather"]').first();
  await expect(icon).toBeVisible();

  const rendered = await icon.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      ariaHidden: element.getAttribute("aria-hidden"),
      backgroundColor: style.backgroundColor,
      height: element.getBoundingClientRect().height,
      maskImage: style.maskImage || style.webkitMaskImage,
      width: element.getBoundingClientRect().width,
    };
  });

  expect(rendered.ariaHidden).toBe("true");
  expect(rendered.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(rendered.height).toBeGreaterThan(0);
  expect(rendered.maskImage).toContain("/icons/seal/feather.png");
  expect(rendered.width).toBeGreaterThan(0);
});

test("uses dedicated generated icons for distinct workflow actions", async ({ page }) => {
  await page.goto("/studio");
  for (const iconName of ["undo", "redo", "save", "copy", "project", "zoom-in", "zoom-out", "lock", "rotate"]) {
    await expect(page.locator(`[data-icon="${iconName}"]`).first(), `${iconName} should be wired in Studio`).toBeAttached();
  }

  await page.goto("/create");
  await expect(page.locator('[data-icon="sliders"]').first()).toBeAttached();
  await expect(page.locator('[data-icon="stamp"]').first()).toBeAttached();

  await page.goto("/");
  await expect(page.locator('[data-icon="shuffle"]').first()).toBeAttached();

  await page.goto("/projects");
  await expect(page.locator('[data-icon="add"]').first()).toBeAttached();

  await page.goto("/dictionary");
  await expect(page.locator('[data-icon="play"]').first()).toBeAttached();

  await page.goto("/gallery");
  await expect(page.locator('[data-icon="grid"]').first()).toBeAttached();
  await expect(page.locator('[data-icon="stamp"]').first()).toBeAttached();
});
