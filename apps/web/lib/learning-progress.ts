export const learningProgressStorageKey = "fangcun.learning-progress.v1";

export type LessonProgressStatus = "started" | "completed";

export type LessonProgressEntry = {
  status: LessonProgressStatus;
  startedAt: string;
  completedAt?: string;
};

export type LearningProgress = {
  version: 1;
  updatedAt: string;
  lessons: Record<string, LessonProgressEntry>;
};

type LearningProgressStorage = Pick<Storage, "getItem" | "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createEmptyLearningProgress(): LearningProgress {
  return { version: 1, updatedAt: "", lessons: {} };
}

export function normalizeLearningProgress(input: unknown): LearningProgress {
  if (!isRecord(input) || input.version !== 1 || !isRecord(input.lessons)) {
    return createEmptyLearningProgress();
  }

  const lessons: Record<string, LessonProgressEntry> = {};
  for (const [slug, value] of Object.entries(input.lessons)) {
    if (!isRecord(value) || (value.status !== "started" && value.status !== "completed") || typeof value.startedAt !== "string") continue;
    lessons[slug] = {
      status: value.status,
      startedAt: value.startedAt,
      ...(typeof value.completedAt === "string" ? { completedAt: value.completedAt } : {}),
    };
  }

  return {
    version: 1,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
    lessons,
  };
}

export function readLearningProgress(storage: LearningProgressStorage): LearningProgress {
  try {
    const raw = storage.getItem(learningProgressStorageKey);
    if (!raw) return createEmptyLearningProgress();
    const parsed: unknown = JSON.parse(raw);
    return normalizeLearningProgress(parsed);
  } catch {
    return createEmptyLearningProgress();
  }
}

export function writeLearningProgress(
  storage: LearningProgressStorage,
  progress: LearningProgress,
  options: { markSyncPending?: boolean } = {},
): boolean {
  try {
    storage.setItem(learningProgressStorageKey, JSON.stringify(progress));
    if (options.markSyncPending !== false) markAccountSyncPending(storage);
    return true;
  } catch {
    return false;
  }
}

export function writeSyncedLearningProgress(
  storage: LearningProgressStorage,
  progress: LearningProgress,
): boolean {
  return writeLearningProgress(storage, progress, { markSyncPending: false });
}

export function markLessonStarted(progress: LearningProgress, slug: string, occurredAt: string): LearningProgress {
  if (progress.lessons[slug]) return progress;
  return {
    ...progress,
    updatedAt: occurredAt,
    lessons: {
      ...progress.lessons,
      [slug]: { status: "started", startedAt: occurredAt },
    },
  };
}

export function markLessonCompleted(progress: LearningProgress, slug: string, occurredAt: string): LearningProgress {
  const current = progress.lessons[slug];
  if (current?.status === "completed") return progress;
  return {
    ...progress,
    updatedAt: occurredAt,
    lessons: {
      ...progress.lessons,
      [slug]: {
        status: "completed",
        startedAt: current?.startedAt ?? occurredAt,
        completedAt: occurredAt,
      },
    },
  };
}

export function countCompletedLessons(progress: LearningProgress, lessonSlugs: readonly string[]): number {
  return lessonSlugs.reduce(
    (count, slug) => count + (progress.lessons[slug]?.status === "completed" ? 1 : 0),
    0,
  );
}

export function findNextLessonSlug(progress: LearningProgress, lessonSlugs: readonly string[]): string | undefined {
  return lessonSlugs.find((slug) => progress.lessons[slug]?.status !== "completed");
}
import { markAccountSyncPending } from "./sync-state";
