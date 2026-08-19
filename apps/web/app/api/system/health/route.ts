import { NextResponse } from "next/server";
import { runtimeVersion } from "../../../../lib/runtime-version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      ...runtimeVersion,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
