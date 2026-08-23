import type { SupabaseClient, User } from "@supabase/supabase-js";

export type CloudAlbumShare = {
  albumId: string;
  refreshedAt: string;
  token: string;
};

type CloudAlbumShareRow = {
  album_id: unknown;
  refreshed_at: unknown;
  token: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseCloudAlbumShare(value: unknown): CloudAlbumShare | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as CloudAlbumShareRow;
  if (
    typeof row.album_id !== "string"
    || !UUID.test(row.album_id)
    || typeof row.token !== "string"
    || !UUID.test(row.token)
    || typeof row.refreshed_at !== "string"
    || Number.isNaN(Date.parse(row.refreshed_at))
  ) return null;
  return { albumId: row.album_id, refreshedAt: row.refreshed_at, token: row.token };
}

export async function listCloudAlbumShares(client: SupabaseClient, user: User): Promise<CloudAlbumShare[]> {
  const { data, error } = await client
    .from("album_share_links")
    .select("album_id,token,refreshed_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("refreshed_at", { ascending: false });
  if (error) throw new Error(`CLOUD_ALBUM_SHARE_LIST_FAILED:${error.message}`);
  return (data ?? []).map(parseCloudAlbumShare).filter((share): share is CloudAlbumShare => share !== null);
}

export async function createCloudAlbumShare(options: { albumId: string; client: SupabaseClient }): Promise<string> {
  const { data, error } = await options.client.rpc("create_album_share", { album_id_input: options.albumId });
  if (error || typeof data !== "string" || !UUID.test(data)) throw new Error(`CLOUD_ALBUM_SHARE_CREATE_FAILED:${error?.message ?? "INVALID_TOKEN"}`);
  return data;
}

export async function revokeCloudAlbumShare(options: { albumId: string; client: SupabaseClient }): Promise<boolean> {
  const { data, error } = await options.client.rpc("revoke_album_share", { album_id_input: options.albumId });
  if (error || typeof data !== "boolean") throw new Error(`CLOUD_ALBUM_SHARE_REVOKE_FAILED:${error?.message ?? "INVALID_RESPONSE"}`);
  return data;
}
