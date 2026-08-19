import { describe, expect, it } from "vitest";
import {
  formatDimensionsMillimeters,
  formatMillimeters,
  localizeHref,
  pairedMetadata,
} from "./i18n";

describe("i18n helpers", () => {
  it("keeps Chinese routes unprefixed and prefixes English routes", () => {
    expect(localizeHref("/create", "zh-Hans")).toBe("/create");
    expect(localizeHref("/create", "en")).toBe("/en/create");
    expect(localizeHref("/#about", "en")).toBe("/en#about");
  });

  it("adds an imperial aid without replacing metric dimensions", () => {
    expect(formatMillimeters(25, "zh-Hans")).toBe("25 mm");
    expect(formatDimensionsMillimeters([25, 25], "zh-Hans")).toBe("25 × 25 mm");
    expect(formatMillimeters(25, "en")).toBe("25mm (0.98in)");
    expect(formatDimensionsMillimeters([25, 25, 60], "en")).toBe(
      "25 x 25 x 60 mm (0.98 x 0.98 x 2.36 in)",
    );
  });

  it("builds reciprocal canonical and hreflang metadata", () => {
    expect(pairedMetadata({
      description: "Create a Chinese seal.",
      locale: "en",
      path: "/create",
      title: "Create | Fangcun",
    }).alternates).toEqual({
      canonical: "/en/create",
      languages: { "zh-Hans": "/create", en: "/en/create" },
    });
  });
});
