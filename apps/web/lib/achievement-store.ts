import {
  achievementDefinitions,
  isAchievementCode,
  type AchievementCode,
  type AchievementEventName,
} from "@fangcun/knowledge/achievements";
import { markAccountSyncPending } from "./sync-state";

export const ACHIEVEMENT_STORAGE_KEY = "fangcun:achievements:v1";
export const ACHIEVEMENT_EARNED_EVENT = "fangcun:achievement-earned";

export type AchievementEvent =
  | { event: "carving_exported"; eventKey: string; format: "pdf" | "png" | "svg" }
  | { event: "historic_seal_saved"; eventKey: string; savedCount: number }
  | { event: "quiz_completed"; eventKey: string; completedCount?: number; score: number; setSlug: string; total: number }
  | { event: "seal_book_created"; eventKey: string }
  | { event: "seal_generated"; eventKey: string }
  | { event: "side_inscription_completed"; eventKey: string }
  | { event: "style_collection_updated"; eraCount: number; eventKey: string };

export type EarnedAchievement = {
  code: AchievementCode;
  earnedAt: string;
  sourceEvent: AchievementEventName;
};

export type AchievementState = {
  version: 1;
  updatedAt: string;
  earned: Record<string, EarnedAchievement>;
  processedEventKeys: string[];
};

export type AchievementStorage = Pick<Storage, "getItem" | "setItem">;

type AchievementEvaluation = {
  awarded: EarnedAchievement[];
  changed: boolean;
  state: AchievementState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function later(left: string, right: string): string {
  return left.localeCompare(right) >= 0 ? left : right;
}

export function createEmptyAchievementState(): AchievementState {
  return { version: 1, updatedAt: "", earned: {}, processedEventKeys: [] };
}

export function normalizeAchievementState(input: unknown): AchievementState {
  if (!isRecord(input) || input.version !== 1) return createEmptyAchievementState();
  const earned: Record<string, EarnedAchievement> = {};
  if (isRecord(input.earned)) {
    for (const [code, value] of Object.entries(input.earned)) {
      if (
        !isAchievementCode(code)
        || !isRecord(value)
        || value.code !== code
        || typeof value.earnedAt !== "string"
        || typeof value.sourceEvent !== "string"
      ) continue;
      const definition = achievementDefinitions.find((candidate) => candidate.code === code);
      if (!definition || definition.condition.event !== value.sourceEvent) continue;
      earned[code] = { code, earnedAt: value.earnedAt, sourceEvent: value.sourceEvent };
    }
  }
  const processedEventKeys = Array.isArray(input.processedEventKeys)
    ? Array.from(new Set(input.processedEventKeys.filter((value): value is string => typeof value === "string"))).slice(-500)
    : [];
  return {
    version: 1,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : "",
    earned,
    processedEventKeys,
  };
}

export function readAchievementState(storage: Pick<AchievementStorage, "getItem">): AchievementState {
  try {
    const raw = storage.getItem(ACHIEVEMENT_STORAGE_KEY);
    return raw ? normalizeAchievementState(JSON.parse(raw) as unknown) : createEmptyAchievementState();
  } catch {
    return createEmptyAchievementState();
  }
}

export function writeAchievementState(
  storage: AchievementStorage,
  state: AchievementState,
  options: { markSyncPending?: boolean } = {},
): boolean {
  try {
    storage.setItem(ACHIEVEMENT_STORAGE_KEY, JSON.stringify(normalizeAchievementState(state)));
    if (options.markSyncPending !== false) markAccountSyncPending(storage);
    return true;
  } catch {
    return false;
  }
}

export function writeSyncedAchievementState(storage: AchievementStorage, state: AchievementState): boolean {
  return writeAchievementState(storage, state, { markSyncPending: false });
}

function conditionMatches(event: AchievementEvent, code: AchievementCode): boolean {
  const definition = achievementDefinitions.find((candidate) => candidate.code === code);
  if (!definition || definition.condition.event !== event.event) return false;
  const condition = definition.condition;
  if (condition.event === "quiz_completed" && event.event === "quiz_completed") {
    if ("setSlug" in condition) return event.setSlug === condition.setSlug && event.score >= condition.minimumScore;
    return (event.completedCount ?? 1) >= condition.minimumCompletedCount;
  }
  if (condition.event === "style_collection_updated" && event.event === "style_collection_updated") {
    return event.eraCount >= condition.minimumEraCount;
  }
  if (condition.event === "historic_seal_saved" && event.event === "historic_seal_saved") {
    return event.savedCount >= condition.minimumSavedCount;
  }
  return true;
}

export function evaluateAchievementEvent(
  state: AchievementState,
  event: AchievementEvent,
  occurredAt: string,
): AchievementEvaluation {
  const current = normalizeAchievementState(state);
  if (current.processedEventKeys.includes(event.eventKey)) {
    return { awarded: [], changed: false, state: current };
  }
  const awarded = achievementDefinitions.flatMap((definition) => {
    if (current.earned[definition.code] || !conditionMatches(event, definition.code)) return [];
    return [{ code: definition.code, earnedAt: occurredAt, sourceEvent: event.event } satisfies EarnedAchievement];
  });
  return {
    awarded,
    changed: true,
    state: {
      version: 1,
      updatedAt: occurredAt,
      earned: {
        ...current.earned,
        ...Object.fromEntries(awarded.map((achievement) => [achievement.code, achievement])),
      },
      processedEventKeys: [...current.processedEventKeys, event.eventKey].slice(-500),
    },
  };
}

export function mergeAchievementStates(local: AchievementState, remote: AchievementState): AchievementState {
  const left = normalizeAchievementState(local);
  const right = normalizeAchievementState(remote);
  const earned: Record<string, EarnedAchievement> = { ...left.earned };
  for (const [code, remoteAchievement] of Object.entries(right.earned)) {
    const localAchievement = earned[code];
    earned[code] = !localAchievement || remoteAchievement.earnedAt < localAchievement.earnedAt
      ? remoteAchievement
      : localAchievement;
  }
  return {
    version: 1,
    updatedAt: left.updatedAt && right.updatedAt ? later(left.updatedAt, right.updatedAt) : left.updatedAt || right.updatedAt,
    earned,
    processedEventKeys: Array.from(new Set([...left.processedEventKeys, ...right.processedEventKeys])).slice(-500),
  };
}

export function mergeEarnedAchievements(
  local: AchievementState,
  remote: readonly EarnedAchievement[],
): AchievementState {
  const remoteState = normalizeAchievementState({
    version: 1,
    updatedAt: remote.reduce((value, item) => value ? later(value, item.earnedAt) : item.earnedAt, ""),
    earned: Object.fromEntries(remote.map((item) => [item.code, item])),
    processedEventKeys: [],
  });
  return mergeAchievementStates(local, remoteState);
}

export function recordAchievementEvent(
  event: AchievementEvent,
  occurredAt = new Date().toISOString(),
): EarnedAchievement[] {
  if (typeof window === "undefined") return [];
  const evaluation = evaluateAchievementEvent(readAchievementState(window.localStorage), event, occurredAt);
  if (!evaluation.changed) return [];
  writeAchievementState(window.localStorage, evaluation.state, {
    markSyncPending: evaluation.awarded.length > 0,
  });
  if (evaluation.awarded.length > 0) {
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent<EarnedAchievement[]>(ACHIEVEMENT_EARNED_EVENT, {
        detail: evaluation.awarded,
      }));
    }, 0);
  }
  return evaluation.awarded;
}
