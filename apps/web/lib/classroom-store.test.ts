import { describe, expect, it } from "vitest";
import {
  formatClassroomCode,
  normalizeClassroomCode,
  normalizeClassroomDisplayName,
  normalizeClassroomTitle,
} from "./classroom-store";

describe("classroom input boundaries", () => {
  it("normalizes invitation codes without changing their meaning", () => {
    expect(normalizeClassroomCode(" abcd-ef12 ")).toBe("ABCDEF12");
    expect(formatClassroomCode("ABCDEF12")).toBe("ABCD EF12");
  });

  it("rejects malformed invitation codes", () => {
    expect(() => normalizeClassroomCode("ABC-123")).toThrow("CLASSROOM_CODE_INVALID");
    expect(() => normalizeClassroomCode("ABCDEF1Z")).toThrow("CLASSROOM_CODE_INVALID");
  });

  it("normalizes bounded teacher and learner labels", () => {
    expect(normalizeClassroomTitle("  秋季  篆刻课 ")).toBe("秋季 篆刻课");
    expect(normalizeClassroomDisplayName("  小 方  ")).toBe("小 方");
    expect(normalizeClassroomDisplayName("   ")).toBeNull();
  });

  it("rejects labels outside the classroom contract", () => {
    expect(() => normalizeClassroomTitle(" ")).toThrow("CLASSROOM_TITLE_INVALID");
    expect(() => normalizeClassroomTitle("课".repeat(81))).toThrow("CLASSROOM_TITLE_INVALID");
    expect(() => normalizeClassroomDisplayName("名".repeat(41))).toThrow("CLASSROOM_DISPLAY_NAME_INVALID");
  });
});
