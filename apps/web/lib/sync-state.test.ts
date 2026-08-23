import { describe, expect, it } from "vitest";
import {
  ACCOUNT_SYNC_STATE_KEY,
  completeAccountSync,
  createEmptyAccountSyncState,
  fingerprintValue,
  linkAccountSyncState,
  markAccountSyncPending,
  readAccountSyncState,
  unlinkAccountSyncState,
} from "./sync-state";

function createStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("account sync state", () => {
  it("links one account, tracks pending work, and clears it after sync", () => {
    const storage = createStorage();
    linkAccountSyncState(storage, { id: "user-1", email: "ink@example.com" });
    markAccountSyncPending(storage, "2026-08-12T01:00:00.000Z");
    expect(readAccountSyncState(storage).pendingSince).toBe("2026-08-12T01:00:00.000Z");

    completeAccountSync(storage, {
      accountId: "user-1",
      accountEmail: "ink@example.com",
      projectFingerprints: { "project-1": "fingerprint" },
      learningFingerprint: "learning",
      achievementFingerprint: "achievements",
      occurredAt: "2026-08-12T02:00:00.000Z",
    });
    expect(readAccountSyncState(storage)).toMatchObject({
      accountId: "user-1",
      lastSyncedAt: "2026-08-12T02:00:00.000Z",
      pendingSince: null,
    });

    unlinkAccountSyncState(storage);
    expect(storage.values.has(ACCOUNT_SYNC_STATE_KEY)).toBe(false);
    expect(readAccountSyncState(storage)).toEqual(createEmptyAccountSyncState());
  });

  it("resets baselines when a different account signs in", () => {
    const storage = createStorage();
    completeAccountSync(storage, {
      accountId: "user-1",
      accountEmail: null,
      projectFingerprints: { "project-1": "fingerprint" },
      learningFingerprint: "learning",
      achievementFingerprint: "achievements",
    });

    expect(linkAccountSyncState(storage, { id: "user-2", email: null }).projectFingerprints).toEqual({});
  });

  it("produces stable fingerprints for equal JSON values", () => {
    expect(fingerprintValue({ text: "方寸", seed: 42 })).toBe(fingerprintValue({ text: "方寸", seed: 42 }));
    expect(fingerprintValue({ text: "方寸", seed: 42 })).not.toBe(fingerprintValue({ text: "方寸", seed: 43 }));
  });
});
