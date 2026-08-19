import { describe, expect, it } from "vitest";
import { classroomExercises, findClassroomExercise } from "./classroom-exercises";

describe("classroom exercise templates", () => {
  it("ships stable, actionable templates for classroom work", () => {
    expect(classroomExercises.map((exercise) => exercise.id)).toEqual([
      "name-seal",
      "red-white",
      "reading-order",
    ]);
    expect(classroomExercises.every((exercise) => exercise.durationMinutes > 0)).toBe(true);
    expect(classroomExercises.every((exercise) => exercise.studioHref.startsWith("/studio?"))).toBe(true);
    expect(classroomExercises.every((exercise) => exercise.promptZh.length > 10 && exercise.teacherNoteZh.length > 10)).toBe(true);
  });

  it("finds templates by versioned id", () => {
    expect(findClassroomExercise("name-seal")?.titleZh).toContain("名章");
    expect(findClassroomExercise("missing")).toBeUndefined();
  });
});
