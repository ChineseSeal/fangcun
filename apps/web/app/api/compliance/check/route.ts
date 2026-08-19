import { NextResponse } from "next/server";
import {
  checkCompliance,
  type ComplianceInput,
} from "@fangcun/compliance";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  const body: unknown = await request.json();
  if (!isRecord(body) || typeof body.text !== "string") {
    return NextResponse.json(
      { ok: false, error: { code: "TEXT_REQUIRED", message: "text 必须是字符串" } },
      { status: 400 },
    );
  }

  const dsl = isRecord(body.dsl)
    ? (body.dsl as ComplianceInput["dsl"])
    : undefined;
  return NextResponse.json(checkCompliance({ text: body.text, dsl }));
}
