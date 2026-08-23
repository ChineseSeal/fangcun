export const STUDIO_HISTORY_LIMIT = 50;

export type StudioHistory<T> = {
  past: T[];
  present: T;
  future: T[];
};

export function createStudioHistory<T>(initial: T): StudioHistory<T> {
  return { past: [], present: initial, future: [] };
}

export function commitStudioHistory<T>(
  history: StudioHistory<T>,
  next: T,
  limit = STUDIO_HISTORY_LIMIT,
): StudioHistory<T> {
  if (Object.is(history.present, next)) return history;
  return {
    past: [...history.past, history.present].slice(-limit),
    present: next,
    future: [],
  };
}

export function undoStudioHistory<T>(history: StudioHistory<T>): StudioHistory<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoStudioHistory<T>(history: StudioHistory<T>): StudioHistory<T> {
  const next = history.future[0];
  if (next === undefined) return history;
  return {
    past: [...history.past, history.present].slice(-STUDIO_HISTORY_LIMIT),
    present: next,
    future: history.future.slice(1),
  };
}
