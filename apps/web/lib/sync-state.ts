export const ACCOUNT_SYNC_STATE_KEY = "fangcun:account-sync:v2";
const LEGACY_ACCOUNT_SYNC_STATE_KEY = "fangcun:account-sync:v1";

export type SyncStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type AccountSyncState = {
  version: 2;
  accountId: string | null;
  accountEmail: string | null;
  lastSyncedAt: string | null;
  pendingSince: string | null;
  projectFingerprints: Record<string, string>;
  learningFingerprint: string | null;
  achievementFingerprint: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createEmptyAccountSyncState(): AccountSyncState {
  return {
    version: 2,
    accountId: null,
    accountEmail: null,
    lastSyncedAt: null,
    pendingSince: null,
    projectFingerprints: {},
    learningFingerprint: null,
    achievementFingerprint: null,
  };
}

export function readAccountSyncState(storage: Pick<SyncStorage, "getItem">): AccountSyncState {
  try {
    const raw = storage.getItem(ACCOUNT_SYNC_STATE_KEY) ?? storage.getItem(LEGACY_ACCOUNT_SYNC_STATE_KEY);
    if (!raw) return createEmptyAccountSyncState();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== 2)) return createEmptyAccountSyncState();
    const projectFingerprints = isRecord(parsed.projectFingerprints)
      ? Object.fromEntries(Object.entries(parsed.projectFingerprints).filter((entry): entry is [string, string] => (
        typeof entry[1] === "string"
      )))
      : {};
    return {
      version: 2,
      accountId: typeof parsed.accountId === "string" ? parsed.accountId : null,
      accountEmail: typeof parsed.accountEmail === "string" ? parsed.accountEmail : null,
      lastSyncedAt: typeof parsed.lastSyncedAt === "string" ? parsed.lastSyncedAt : null,
      pendingSince: typeof parsed.pendingSince === "string" ? parsed.pendingSince : null,
      projectFingerprints,
      learningFingerprint: typeof parsed.learningFingerprint === "string" ? parsed.learningFingerprint : null,
      achievementFingerprint: typeof parsed.achievementFingerprint === "string" ? parsed.achievementFingerprint : null,
    };
  } catch {
    return createEmptyAccountSyncState();
  }
}

function writeAccountSyncState(storage: Pick<SyncStorage, "setItem">, state: AccountSyncState): void {
  storage.setItem(ACCOUNT_SYNC_STATE_KEY, JSON.stringify(state));
}

export function linkAccountSyncState(
  storage: Pick<SyncStorage, "getItem" | "setItem">,
  account: { id: string; email: string | null },
): AccountSyncState {
  const current = readAccountSyncState(storage);
  const next = current.accountId === account.id
    ? { ...current, accountEmail: account.email }
    : { ...createEmptyAccountSyncState(), accountId: account.id, accountEmail: account.email };
  writeAccountSyncState(storage, next);
  return next;
}

export function unlinkAccountSyncState(storage: SyncStorage): void {
  storage.removeItem(ACCOUNT_SYNC_STATE_KEY);
  storage.removeItem(LEGACY_ACCOUNT_SYNC_STATE_KEY);
}

export function markAccountSyncPending(
  storage: Pick<SyncStorage, "getItem" | "setItem">,
  occurredAt = new Date().toISOString(),
): AccountSyncState {
  const current = readAccountSyncState(storage);
  const next = { ...current, pendingSince: current.pendingSince ?? occurredAt };
  writeAccountSyncState(storage, next);
  return next;
}

export function completeAccountSync(
  storage: Pick<SyncStorage, "getItem" | "setItem">,
  options: {
    accountId: string;
    accountEmail: string | null;
    projectFingerprints: Record<string, string>;
    learningFingerprint: string;
    achievementFingerprint: string;
    occurredAt?: string;
  },
): AccountSyncState {
  const next: AccountSyncState = {
    version: 2,
    accountId: options.accountId,
    accountEmail: options.accountEmail,
    lastSyncedAt: options.occurredAt ?? new Date().toISOString(),
    pendingSince: null,
    projectFingerprints: options.projectFingerprints,
    learningFingerprint: options.learningFingerprint,
    achievementFingerprint: options.achievementFingerprint,
  };
  writeAccountSyncState(storage, next);
  return next;
}

export function fingerprintValue(value: unknown): string {
  const input = JSON.stringify(value);
  let forward = 2166136261;
  let backward = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    forward ^= input.charCodeAt(index);
    forward = Math.imul(forward, 16777619);
    backward ^= input.charCodeAt(input.length - index - 1);
    backward = Math.imul(backward, 16777619);
  }
  return `${(forward >>> 0).toString(16)}-${(backward >>> 0).toString(16)}-${input.length}`;
}
