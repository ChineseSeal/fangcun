import { NextResponse } from "next/server";
import { findQuizSet, gradeQuizAnswer } from "@fangcun/knowledge/quizzes/server";

type RouteContext = { params: Promise<{ setSlug: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { setSlug } = await params;
  if (!findQuizSet(setSlug)) {
    return NextResponse.json(
      { ok: false, error: { code: "QUIZ_SET_NOT_FOUND", message: "未找到这组小测" } },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_JSON", message: "请求内容不是有效 JSON" } },
      { status: 400 },
    );
  }

  if (!isRecord(body) || typeof body.questionId !== "string" || typeof body.optionId !== "string") {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_SUBMISSION", message: "请选择一个有效答案" } },
      { status: 400 },
    );
  }

  const result = gradeQuizAnswer(setSlug, body.questionId, body.optionId);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: { code: "QUIZ_ANSWER_NOT_FOUND", message: "题目或选项不存在" } },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, result });
}
