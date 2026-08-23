import { NextResponse } from "next/server";
import { parseAlbumShare } from "@/lib/album-share";
import { getAlbumShareServiceClient } from "@/lib/album-share-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ token: string }> };

function response(body: object, status: number) {
  return NextResponse.json(body, { headers: { "cache-control": "private, no-store" }, status });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!UUID.test(token)) return response({ ok: false, error: { code: "ALBUM_SHARE_NOT_FOUND" } }, 404);
  const service = getAlbumShareServiceClient();
  if (!service) return response({ ok: false, error: { code: "ALBUM_SHARE_NOT_CONFIGURED" } }, 503);

  const { data, error } = await service
    .from("album_share_links")
    .select("title,layout,page_size,per_page,page_count,colophon,album_share_items(page,slot,caption,dsl)")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) return response({ ok: false, error: { code: "ALBUM_SHARE_UNAVAILABLE" } }, 500);
  const share = parseAlbumShare(data);
  if (!share) return response({ ok: false, error: { code: "ALBUM_SHARE_NOT_FOUND" } }, 404);
  return response({ ok: true, share }, 200);
}
