import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const academyContentUrl = new URL("../content/academy/", import.meta.url);

describe("academy MDX content", () => {
  it("ships five interactive lesson files", () => {
    const files = readdirSync(academyContentUrl).filter((file) => file.endsWith(".mdx")).sort();
    expect(files).toEqual([
      "dao-yintui.mdx",
      "reading-order.mdx",
      "yinni.mdx",
      "zhangfa.mdx",
      "zhu-bai.mdx",
    ]);

    for (const file of files) {
      const content = readFileSync(new URL(file, academyContentUrl), "utf8");
      expect(content).toContain("<LessonInteractive");
      expect(content).toContain("<TermRichText");
      expect(content).toContain("### 继续核验");
      expect(content.length).toBeGreaterThan(500);
    }
  });
});
