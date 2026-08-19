import { NextResponse } from "next/server";
import { relayoutSeal } from "@fangcun/seal-engine";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  if (!isRecord(body) || typeof body.strategy !== "string") {
    return NextResponse.json(
      { ok: false, error: { code: "STRATEGY_REQUIRED", message: "strategy 必须是字符串" } },
      { status: 400 },
    );
  }

  const result = relayoutSeal(body.dsl ?? body, body.strategy);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
