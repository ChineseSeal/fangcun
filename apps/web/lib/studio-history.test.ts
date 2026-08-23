import { describe, expect, it } from "vitest";
import {
  commitStudioHistory,
  createStudioHistory,
  redoStudioHistory,
  STUDIO_HISTORY_LIMIT,
  undoStudioHistory,
} from "./studio-history";

describe("studio history", () => {
  it("undoes and redoes committed editor state", () => {
    const initial = createStudioHistory({ density: 0.76 });
    const changed = commitStudioHistory(initial, { density: 0.88 });
    const undone = undoStudioHistory(changed);

    expect(undone.present.density).toBe(0.76);
    expect(redoStudioHistory(undone).present.density).toBe(0.88);
  });

  it("keeps at least fifty undo steps and clears redo after a new command", () => {
    let history = createStudioHistory(0);
    for (let value = 1; value <= STUDIO_HISTORY_LIMIT + 5; value += 1) {
      history = commitStudioHistory(history, value);
    }
    expect(history.past).toHaveLength(STUDIO_HISTORY_LIMIT);

    history = undoStudioHistory(history);
    expect(history.future).toHaveLength(1);
    history = commitStudioHistory(history, 99);
    expect(history.future).toHaveLength(0);
  });
});
