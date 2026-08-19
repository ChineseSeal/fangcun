import { NextResponse } from "next/server";
import { GALLERY_REVIEW_ACTIONS, GALLERY_REVIEW_SUBJECTS, normalizeReviewNote, reviewReasonIsValid, type GalleryReviewAction, type GalleryReviewSubject } from "@/lib/gallery-review-policy";
import { requireGalleryReviewer } from "@/lib/gallery-review-server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function errorResponse(code: string, status: number) {
  return NextResponse.json({ ok: false, error: { code } }, { headers: { "cache-control": "no-store" }, status });
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function parseAction(value: unknown): { ok: true; value: { nextStatus: GalleryReviewAction; reviewerNote: string | null; subjectId: string; subjectType: GalleryReviewSubject } } | { ok: false } {
  if (!isRecord(value)) return { ok: false };
  const subjectType = value.subjectType;
  const nextStatus = value.nextStatus;
  const subjectId = value.subjectId;
  const reviewerNote = normalizeReviewNote(value.reviewerNote);
  if (typeof subjectType !== "string" || !(GALLERY_REVIEW_SUBJECTS as readonly string[]).includes(subjectType)) return { ok: false };
  if (typeof nextStatus !== "string" || !(GALLERY_REVIEW_ACTIONS as readonly string[]).includes(nextStatus)) return { ok: false };
  if (typeof subjectId !== "string" || !UUID.test(subjectId) || !reviewReasonIsValid(nextStatus as GalleryReviewAction, reviewerNote)) return { ok: false };
  return { ok: true, value: { nextStatus: nextStatus as GalleryReviewAction, reviewerNote, subjectId, subjectType: subjectType as GalleryReviewSubject } };
}

export async function GET(request: Request) {
  const authorized = await requireGalleryReviewer(request);
  if (!authorized.ok) return errorResponse(authorized.code, authorized.code === "REVIEW_NOT_CONFIGURED" ? 503 : authorized.code === "UNAUTHORIZED" ? 401 : 403);
  const response = await authorized.service.rpc("get_gallery_review_dashboard", { queue_limit: 50 });
  if (response.error || !isRecord(response.data)) return errorResponse("REVIEW_QUEUE_UNAVAILABLE", 500);
  const queue = response.data;
  const dashboard = {
    posts: arrayOfRecords(queue.posts).flatMap((row) => {
      const id = stringValue(row.id);
      const ownerId = stringValue(row.owner_id);
      const status = row.status;
      const createdAt = stringValue(row.created_at);
      if (!id || !ownerId || !createdAt || typeof status !== "string" || !["pending", "published", "rejected", "removed"].includes(status)) return [];
      return [{
        id,
        ownerId,
        title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : null,
        text: stringValue(row.text) ?? "",
        status,
        reviewReason: typeof row.review_reason === "string" ? row.review_reason : null,
        publishedAt: stringValue(row.published_at),
        createdAt,
      }];
    }),
    reports: arrayOfRecords(queue.reports).flatMap((row) => {
      const id = stringValue(row.id);
      const postId = stringValue(row.post_id);
      const reporterId = stringValue(row.reporter_id);
      const createdAt = stringValue(row.created_at);
      const reason = row.reason;
      if (!id || !postId || !reporterId || !createdAt || typeof reason !== "string" || !["copyright", "impersonation", "illegal", "other"].includes(reason)) return [];
      return [{ id, postId, reporterId, createdAt, reason, detail: typeof row.detail === "string" ? row.detail : null }];
    }),
    appeals: arrayOfRecords(queue.appeals).flatMap((row) => {
      const id = stringValue(row.id);
      const postId = stringValue(row.post_id);
      const appellantId = stringValue(row.appellant_id);
      const reason = stringValue(row.reason);
      const createdAt = stringValue(row.created_at);
      if (!id || !postId || !appellantId || !reason || !createdAt) return [];
      return [{ id, postId, appellantId, reason, createdAt }];
    }),
  };
  return NextResponse.json({ ok: true, dashboard }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const authorized = await requireGalleryReviewer(request);
  if (!authorized.ok) return errorResponse(authorized.code, authorized.code === "REVIEW_NOT_CONFIGURED" ? 503 : authorized.code === "UNAUTHORIZED" ? 401 : 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("REVIEW_REQUEST_INVALID", 400);
  }
  const action = parseAction(body);
  if (!action.ok) return errorResponse("REVIEW_REQUEST_INVALID", 400);
  const response = await authorized.service.rpc("apply_gallery_review", {
    next_status_input: action.value.nextStatus,
    reviewer_id_input: authorized.user.id,
    reviewer_note_input: action.value.reviewerNote,
    subject_id_input: action.value.subjectId,
    subject_type_input: action.value.subjectType,
  });
  if (response.error) {
    const status = response.error.code === "P0002" ? 404 : response.error.code === "P0001" ? 409 : response.error.code === "22023" ? 400 : 500;
    return errorResponse(status === 500 ? "REVIEW_UPDATE_FAILED" : "REVIEW_TRANSITION_INVALID", status);
  }
  return NextResponse.json({ ok: true, event: response.data }, { headers: { "cache-control": "no-store" } });
}
