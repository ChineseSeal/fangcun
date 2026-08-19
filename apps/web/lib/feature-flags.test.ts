import { afterEach, describe, expect, it } from "vitest";
import { isFeatureEnabled } from "./feature-flags";

const originalFlags = process.env.NEXT_PUBLIC_FEATURE_FLAGS;

afterEach(() => {
  if (originalFlags === undefined) {
    delete process.env.NEXT_PUBLIC_FEATURE_FLAGS;
  } else {
    process.env.NEXT_PUBLIC_FEATURE_FLAGS = originalFlags;
  }
});

describe("isFeatureEnabled", () => {
  it("uses safe defaults", () => {
    delete process.env.NEXT_PUBLIC_FEATURE_FLAGS;

    expect(isFeatureEnabled("home.livePreview")).toBe(true);
    expect(isFeatureEnabled("viewer3d.enabled")).toBe(true);
    expect(isFeatureEnabled("motion.scrollNarrative")).toBe(true);
  });

  it("applies explicit environment overrides", () => {
    process.env.NEXT_PUBLIC_FEATURE_FLAGS =
      "home.livePreview=false,viewer3d.enabled=true,motion.scrollNarrative=false";

    expect(isFeatureEnabled("home.livePreview")).toBe(false);
    expect(isFeatureEnabled("viewer3d.enabled")).toBe(true);
    expect(isFeatureEnabled("motion.scrollNarrative")).toBe(false);
  });
});
