import { describe, expect, it } from "vitest";
import { checkCompliance } from "./index";

describe("checkCompliance", () => {
  it("blocks government organization names", () => {
    const result = checkCompliance({ text: "XX市人民政府" });

    expect(result.ok).toBe(false);
    expect(result.decision).toBe("block");
    expect(result.findings[0]?.code).toBe("GOV_ORG_NAME");
  });

  it("blocks official seal terms", () => {
    const result = checkCompliance({ text: "财务专用章" });

    expect(result.ok).toBe(false);
    expect(result.findings[0]?.code).toBe("OFFICIAL_SEAL_TERM");
  });

  it("warns but allows personal seal wording", () => {
    const result = checkCompliance({ text: "张三之印" });

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("warning");
    expect(result.findings[0]?.code).toBe("PERSONAL_SEAL_WARNING");
  });

  it("allows ordinary creative text", () => {
    expect(checkCompliance({ text: "清风明月" })).toEqual({
      ok: true,
      decision: "allow",
      findings: [],
    });
  });
});
